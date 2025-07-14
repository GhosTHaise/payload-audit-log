import { GeneratedTypes, Config, Plugin } from 'payload';
import { AfterChangeHook, AfterDeleteHook, CollectionConfig } from 'payload/dist/collections/config/types';

/**
 * Configuration options for the Audit Log plugin.
 */
export interface AuditLogOptions {
  /**
   * List of collection names to enable audit logging for.
   * 
   * Example:
   * collections: ['users', 'posts']
   * 
   * NOTE: The 'audit-logs' collection is excluded by default and cannot be tracked.
   */
  collections?: (keyof Omit<GeneratedTypes["collectionsUntyped"], 'audit-logs'>)[];

  /**
   * Whether to include authentication events (login/logout, etc.) in the audit logs.
   * Default is false.
   */
  includeAuth?: boolean;

  /**
   * Array of field names to exclude from change comparison when logging 'update' actions.
   * 
   * Example:
   * columnsToIgnore: ['updatedAt', 'lastLogin']
   * 
   * Fields in this list will not trigger a logged change if they are the only fields modified.
   */
  columnsToIgnore?: string[];
}

/**
 * Default values used when no specific plugin options are provided.
 */
export const defaultOptions: AuditLogOptions = {
  collections: [],
  includeAuth: false,
  columnsToIgnore: []
};

/**
 * Main Audit Log plugin initializer.
 * 
 * This plugin tracks document changes (create, update, delete) for the specified collections
 * and optionally includes auth-related events.
 * 
 * @param options - Plugin customization options (see AuditLogOptions)
 * @returns A Payload plugin function.
 */
export const auditLogPlugin = (options: AuditLogOptions = {}): Plugin => {
    const pluginOptions = { ...defaultOptions, ...options };

    return (config: Config): Config => {
        const auditLogCollection: CollectionConfig = {
            slug: 'audit-logs',
            admin: {
                useAsTitle: 'action',
            },
            access: {
                read: () => true,
            },
            fields: [
                {
                    name: 'collection',
                    type: 'text',
                    required: true,
                },
                {
                    name: 'action',
                    type: 'select',
                    options: ['create', 'update', 'delete', 'read'],
                    required: true,
                },
                {
                    name: 'documentId',
                    type: 'text',
                    required: true,
                },
                {
                    name: 'timestamp',
                    type: 'date',
                    required: true,
                },
                {
                    name: 'user',
                    type: 'relationship',
                    relationTo: config.admin?.user ?? 'users',
                    required: false,
                },
                {
                    name: 'changes',
                    type: 'json',
                    admin: {
                        description: 'Changes made in this operation',
                    },
                },
            ],
        };

        config.collections = [...(config.collections || []), auditLogCollection];

        const collectionsToAudit = [
            ...(pluginOptions.collections ?? []),
            ...(pluginOptions.includeAuth ? [config.admin?.user ?? 'users'] : []),
        ];

        config.collections = config.collections?.map((collection) => {
            if (collectionsToAudit.includes(collection.slug)) {
                const afterChange: AfterChangeHook<any> = async ({
                    req,
                    operation,
                    doc,
                    previousDoc,
                }) => {
                    const action = operation === 'create' ? 'create' : 'update';
                    let changes = null;

                    if (action === 'update' && previousDoc) {
                        changes = Object.keys(doc).reduce((acc, key) => {
                            if (JSON.stringify(doc[key]) !== JSON.stringify(previousDoc[key])) {
                                if (options.columnsToIgnore?.includes(key)) {
                                    return acc;
                                }

                                acc[key] = {
                                    old: previousDoc[key],
                                    new: doc[key],
                                };
                            }
                            return acc;
                        }, {} as Record<string, any>);
                    }

                    await req.payload.create({
                        collection: 'audit-logs',
                        data: {
                            collection: collection.slug,
                            action,
                            documentId: String(doc.id ?? previousDoc?.id ?? ''),
                            timestamp: new Date().toISOString(),
                            user: req.user?.id,
                            changes: action === 'update' ? changes : doc,
                        },
                    });
                    return doc;
                };

                const afterDelete: AfterDeleteHook = async ({ req, doc }) => {
                    await req.payload.create({
                        collection: 'audit-logs',
                        data: {
                            collection: collection.slug,
                            action: 'delete',
                            documentId: String(doc.id ?? ''),
                            timestamp: new Date().toISOString(),
                            user: req.user?.id,
                            changes: doc, // Store the entire document being deleted
                        },
                    });
                };

                const hooks: any = {
                    afterChange: [afterChange, ...(collection.hooks?.afterChange || [])],
                    afterDelete: [afterDelete, ...(collection.hooks?.afterDelete || [])],
                };

                return {
                    ...collection,
                    hooks: {
                        ...collection.hooks,
                        ...hooks,
                    },
                };
            }
            return collection;
        });

        return config;
    };
};
