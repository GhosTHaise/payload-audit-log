import { GeneratedTypes, Config, Plugin, PayloadRequest } from 'payload';
import { AfterChangeHook, AfterDeleteHook, CollectionConfig } from 'payload/dist/collections/config/types';
import { formatChanges, shouldLogChanges, ChangeFormatterOptions } from './lib/change-formatter';
import { 
  shouldLogAuditOperation, 
  markDirectOperation, 
  markCascadingOperation,
  initializeAuditContext
} from './lib/audit-context';

// Type for extended request with audit context
interface AuditRequest extends PayloadRequest {
  auditRequestId?: string;
}

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

  /**
   * Configuration for change formatting to reduce noise in audit logs.
   */
  changeFormatter?: ChangeFormatterOptions;

  /**
   * Whether to allow cascading audit logs when relationships are updated.
   * When false, only direct user operations are logged.
   * Default is false.
   */
  allowCascading?: boolean;

  /**
   * Maximum depth for cascading operations when allowCascading is true.
   * Default is 1.
   */
  maxCascadeDepth?: number;

  /**
   * Whether to allow overriding system field exclusions.
   * When false (default), system fields like 'hash', 'salt', etc. are always excluded.
   * When true, user-provided excludeFields can override system defaults.
   */
  allowSystemFieldOverride?: boolean;
}

/**
 * Default values used when no specific plugin options are provided.
 */
export const defaultOptions: AuditLogOptions = {
  collections: [],
  includeAuth: false,
  columnsToIgnore: [
    'id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 
    'sessions', 'password', 'token', 'secret', 'hash', 'salt',
    'lockUntil', 'loginAttempts', 'resetPasswordToken', 'resetPasswordExpiration',
    'lastLogin', 'lastLoginAt', 'emailVerified', 'emailVerificationToken',
    'emailVerificationExpiration', 'forgotPasswordToken', 'forgotPasswordExpiration'
  ],
  changeFormatter: {
    excludeFields: [
      'id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 
      'sessions', 'password', 'token', 'secret', 'hash', 'salt',
      'lockUntil', 'loginAttempts', 'resetPasswordToken', 'resetPasswordExpiration',
      'lastLogin', 'lastLoginAt', 'emailVerified', 'emailVerificationToken',
      'emailVerificationExpiration', 'forgotPasswordToken', 'forgotPasswordExpiration'
    ],
    meaningfulChangesOnly: true,
    maxDepth: 2
  },
  allowCascading: false,
  maxCascadeDepth: 0,
  allowSystemFieldOverride: false
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
export const auditLogPlugin = (options: AuditLogOptions = {}): any => {
    // Merge user options with defaults
    const pluginOptions = {
        ...defaultOptions,
        ...options,
        // Handle columnsToIgnore based on override setting
        columnsToIgnore: options.allowSystemFieldOverride 
            ? (options.columnsToIgnore ?? defaultOptions.columnsToIgnore)
            : [
                ...(defaultOptions.columnsToIgnore ?? []),
                ...(options.columnsToIgnore ?? [])
              ],
        // Merge changeFormatter options
        changeFormatter: {
            ...defaultOptions?.changeFormatter,
            ...options.changeFormatter,
            // Handle excludeFields based on override setting
            excludeFields: options.allowSystemFieldOverride
                ? (options.changeFormatter?.excludeFields ?? defaultOptions?.changeFormatter?.excludeFields)
                : [
                    ...(defaultOptions?.changeFormatter?.excludeFields ?? []),
                    ...(options.changeFormatter?.excludeFields ?? [])
                  ]
        }
    };

    return (config: any): any => {
        // Note: Express middleware integration would need to be handled at the application level
        // The context tracking will work through the request object passed to hooks

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

        config.collections = config.collections?.map((collection: CollectionConfig) => {
            if (collectionsToAudit.includes(collection.slug)) {
                const afterChange: AfterChangeHook<any> = async ({
                    req,
                    operation,
                    doc,
                    previousDoc,
                }) => {
                    const action = operation === 'create' ? 'create' : 'update';
                    const documentId = String(doc.id ?? previousDoc?.id ?? '');
                    
                    // Initialize context if it doesn't exist
                    const auditReq = req as AuditRequest;
                    if (!auditReq.auditRequestId) {
                        initializeAuditContext(auditReq);
                    }
                    
                    // Check if this operation should be logged based on context
                    const shouldLog = shouldLogAuditOperation(
                        auditReq,
                        collection.slug,
                        documentId,
                        {
                            allowCascading: pluginOptions.allowCascading,
                            maxCascadeDepth: pluginOptions.maxCascadeDepth
                        }
                    );

                    if (!shouldLog) {
                        // Mark this as a cascading operation for future reference
                        markCascadingOperation(auditReq, collection.slug, documentId);
                        return doc;
                    }

                    // Mark this as a direct operation
                    markDirectOperation(auditReq, collection.slug, documentId);

                    let changes = null;

                    if (action === 'update' && previousDoc) {
                        // Use the new change formatter to get meaningful changes
                        const formatterOptions = {
                            ...pluginOptions.changeFormatter,
                            excludeFields: [
                                ...(pluginOptions.columnsToIgnore || []),
                                ...(pluginOptions.changeFormatter?.excludeFields || [])
                            ]
                        };
                        
                        changes = formatChanges(doc, previousDoc, formatterOptions);
                        
                        // Only log if there are meaningful changes
                        if (!shouldLogChanges(changes)) {
                            return doc;
                        }
                        
                        // Don't create audit log if changes is empty object
                        if (changes && typeof changes === 'object' && Object.keys(changes).length === 0) {
                            return doc;
                        }
                    }

                    await req.payload.create({
                        collection: 'audit-logs',
                        data: {
                            collection: collection.slug,
                            action,
                            documentId,
                            timestamp: new Date().toISOString(),
                            user: req.user?.id,
                            changes: action === 'update' ? changes : doc,
                        },
                    });
                    return doc;
                };

                const afterDelete: AfterDeleteHook = async ({ req, doc }) => {
                    const documentId = String(doc.id ?? '');
                    
                    // Initialize context if it doesn't exist
                    const auditReq = req as AuditRequest;
                    if (!auditReq.auditRequestId) {
                        initializeAuditContext(auditReq);
                    }
                    
                    // Check if this operation should be logged based on context
                    const shouldLog = shouldLogAuditOperation(
                        auditReq,
                        collection.slug,
                        documentId,
                        {
                            allowCascading: pluginOptions.allowCascading,
                            maxCascadeDepth: pluginOptions.maxCascadeDepth
                        }
                    );

                    if (!shouldLog) {
                        // Mark this as a cascading operation for future reference
                        markCascadingOperation(auditReq, collection.slug, documentId);
                        return;
                    }

                    // Mark this as a direct operation
                    markDirectOperation(auditReq, collection.slug, documentId);

                    await req.payload.create({
                        collection: 'audit-logs',
                        data: {
                            collection: collection.slug,
                            action: 'delete',
                            documentId,
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
