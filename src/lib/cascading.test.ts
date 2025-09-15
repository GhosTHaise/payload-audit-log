import { describe, expect, beforeEach, afterEach, test } from "vitest";

import { 
  shouldLogAuditOperation, 
  markDirectOperation, 
  markCascadingOperation,
  initializeAuditContext,
  cleanupAuditContext
} from './audit-context';

// Mock request object
interface MockRequest {
  auditRequestId?: string;
  user?: { id: string };
}

describe('Cascading Audit Log Prevention', () => {
  let req1: MockRequest;
  let req2: MockRequest;
  let req3: MockRequest;
  let req4: MockRequest;

  beforeEach(() => {
    req1 = {};
    req2 = {};
    req3 = {};
    req4 = {};
  });

  afterEach(() => {
    cleanupAuditContext(req1);
    cleanupAuditContext(req2);
    cleanupAuditContext(req3);
    cleanupAuditContext(req4);
  });

  test('should log direct operations', () => {
    initializeAuditContext(req1);
    
    const shouldLogContract = shouldLogAuditOperation(req1, 'contracts', 'contract-123', {
      allowCascading: false
    });

    expect(shouldLogContract).toBe(true);
    
    if (shouldLogContract) {
      markDirectOperation(req1, 'contracts', 'contract-123');
    }
  });

  test('should not log cascading operations when allowCascading is false', () => {
    initializeAuditContext(req1);
    markDirectOperation(req1, 'contracts', 'contract-123');
    
    const shouldLogClient = shouldLogAuditOperation(req1, 'clients', 'client-456', {
      allowCascading: false
    });

    expect(shouldLogClient).toBe(false);
    
    if (!shouldLogClient) {
      markCascadingOperation(req1, 'clients', 'client-456');
    }
  });

  test('should log cascading operations when allowCascading is true', () => {
    initializeAuditContext(req2);
    markDirectOperation(req2, 'contracts', 'contract-123');

    const shouldLogClientWithCascading = shouldLogAuditOperation(req2, 'clients', 'client-456', {
      allowCascading: true,
      maxCascadeDepth: 2
    });

    expect(shouldLogClientWithCascading).toBe(true);
    
    if (shouldLogClientWithCascading) {
      markCascadingOperation(req2, 'clients', 'client-456');
    }
  });

  test('should respect cascade depth limits', () => {
    initializeAuditContext(req3);
    markDirectOperation(req3, 'contracts', 'contract-123');
    markCascadingOperation(req3, 'clients', 'client-456');

    // This should be logged as it's within the cascade depth (depth 1 < maxDepth 2)
    const shouldLogUserDeep = shouldLogAuditOperation(req3, 'users', 'user-789', {
      allowCascading: true,
      maxCascadeDepth: 2
    });

    expect(shouldLogUserDeep).toBe(true);

    // Mark this operation to increase depth
    markCascadingOperation(req3, 'users', 'user-789');

    // This should NOT be logged as it exceeds the cascade depth (depth 2 >= maxDepth 2)
    const shouldLogDeepNested = shouldLogAuditOperation(req3, 'deep-nested', 'deep-123', {
      allowCascading: true,
      maxCascadeDepth: 2
    });

    expect(shouldLogDeepNested).toBe(false);
  });

  test('should handle different collections in same request independently', () => {
    initializeAuditContext(req4);

    // First operation - should be logged
    const shouldLogFirst = shouldLogAuditOperation(req4, 'posts', 'post-123', {
      allowCascading: false
    });
    expect(shouldLogFirst).toBe(true);
    
    if (shouldLogFirst) {
      markDirectOperation(req4, 'posts', 'post-123');
    }

    // Second operation on different collection - should NOT be logged when cascading is false
    // because it's treated as a cascading operation after the first direct operation
    const shouldLogSecond = shouldLogAuditOperation(req4, 'comments', 'comment-456', {
      allowCascading: false
    });
    expect(shouldLogSecond).toBe(false);
  });

  test('should fallback to logging when no context exists', () => {
    const reqWithoutContext: MockRequest = {};
    
    const shouldLog = shouldLogAuditOperation(reqWithoutContext, 'test', 'test-123', {
      allowCascading: false
    });

    expect(shouldLog).toBe(true);
  });
});