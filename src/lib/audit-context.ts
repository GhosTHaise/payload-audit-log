/**
 * Context tracking system to prevent cascading audit logs.
 * This helps distinguish between direct user changes and automatic relationship updates.
 */

/**
 * Context information for tracking audit operations.
 */
export interface AuditContext {
  /**
   * The original collection that triggered the audit operation.
   */
  sourceCollection?: string;
  
  /**
   * The original document ID that triggered the audit operation.
   */
  sourceDocumentId?: string;
  
  /**
   * Whether this is a direct user operation or a cascading update.
   */
  isDirectOperation?: boolean;
  
  /**
   * Timestamp when the context was created.
   */
  timestamp?: number;
  
  /**
   * Stack of operations to track nested updates.
   */
  operationStack?: string[];
}

/**
 * Global context store for tracking audit operations.
 * This is a simple in-memory store that gets cleared between requests.
 */
class AuditContextManager {
  private contexts = new Map<string, AuditContext>();
  private requestContexts = new Map<string, string>();

  /**
   * Creates a new audit context for a request.
   */
  createContext(requestId: string, sourceCollection?: string, sourceDocumentId?: string): AuditContext {
    const context: AuditContext = {
      sourceCollection,
      sourceDocumentId,
      isDirectOperation: true,
      timestamp: Date.now(),
      operationStack: []
    };
    
    this.contexts.set(requestId, context);
    return context;
  }

  /**
   * Gets the current context for a request.
   */
  getContext(requestId: string): AuditContext | undefined {
    return this.contexts.get(requestId);
  }

  /**
   * Updates the context to indicate a cascading operation.
   */
  markAsCascading(requestId: string, collection: string, documentId: string): void {
    const context = this.contexts.get(requestId);
    if (context) {
      context.isDirectOperation = false;
      context.operationStack = context.operationStack || [];
      context.operationStack.push(`${collection}:${documentId}`);
    }
  }

  /**
   * Checks if an operation should be logged based on context.
   */
  shouldLogOperation(
    requestId: string, 
    collection: string, 
    documentId: string,
    options: {
      allowCascading?: boolean;
      maxCascadeDepth?: number;
    } = {}
  ): boolean {
    const context = this.contexts.get(requestId);
    
    // If no context, allow logging (fallback behavior)
    if (!context) {
      return true;
    }

    // If this is the source collection and document, always log
    if (context.sourceCollection === collection && context.sourceDocumentId === documentId) {
      return true;
    }

    // If cascading is not allowed, don't log other operations
    if (!options.allowCascading) {
      return false;
    }

    // If cascading is allowed, check depth limits
    const maxDepth = options.maxCascadeDepth || 1;
    if (context.operationStack && context.operationStack.length >= maxDepth) {
      return false;
    }

    // Allow logging if within depth limits
    return true;
  }

  /**
   * Clears the context for a request.
   */
  clearContext(requestId: string): void {
    this.contexts.delete(requestId);
    this.requestContexts.delete(requestId);
  }

  /**
   * Generates a unique request ID.
   */
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Associates a request with a context.
   */
  setRequestContext(requestId: string, contextId: string): void {
    this.requestContexts.set(requestId, contextId);
  }

  /**
   * Gets the context ID for a request.
   */
  getRequestContextId(requestId: string): string | undefined {
    return this.requestContexts.get(requestId);
  }
}

// Global instance
export const auditContextManager = new AuditContextManager();

/**
 * Initialize audit context for a request.
 * This should be called at the beginning of each request.
 */
export function initializeAuditContext(req: any): string {
  // Generate a unique request ID
  const requestId = auditContextManager.generateRequestId();
  
  // Store it in the request for later use
  req.auditRequestId = requestId;
  
  return requestId;
}

/**
 * Clean up audit context for a request.
 * This should be called at the end of each request.
 */
export function cleanupAuditContext(req: any): void {
  const requestId = req.auditRequestId;
  if (requestId) {
    auditContextManager.clearContext(requestId);
  }
}

/**
 * Helper function to check if an operation should be logged.
 */
export function shouldLogAuditOperation(
  req: any,
  collection: string,
  documentId: string,
  options: {
    allowCascading?: boolean;
    maxCascadeDepth?: number;
  } = {}
): boolean {
  const requestId = req.auditRequestId;
  if (!requestId) {
    return true; // Fallback to logging if no context
  }

  return auditContextManager.shouldLogOperation(requestId, collection, documentId, options);
}

/**
 * Helper function to mark the start of a direct operation.
 */
export function markDirectOperation(req: any, collection: string, documentId: string): void {
  const requestId = req.auditRequestId;
  if (!requestId) {
    return;
  }

  const context = auditContextManager.getContext(requestId);
  if (context) {
    context.sourceCollection = collection;
    context.sourceDocumentId = documentId;
    context.isDirectOperation = true;
  } else {
    auditContextManager.createContext(requestId, collection, documentId);
  }
}

/**
 * Helper function to mark a cascading operation.
 */
export function markCascadingOperation(req: any, collection: string, documentId: string): void {
  const requestId = req.auditRequestId;
  if (!requestId) {
    return;
  }

  auditContextManager.markAsCascading(requestId, collection, documentId);
}
