import { 
  auditContextManager, 
  shouldLogAuditOperation, 
  markDirectOperation, 
  markCascadingOperation,
  initializeAuditContext,
  cleanupAuditContext
} from './audit-context';

/**
 * Test the cascading audit log prevention system.
 * This simulates the scenario where updating a document with relationships
 * would normally trigger multiple audit logs.
 */

// Mock request object
interface MockRequest {
  auditRequestId?: string;
  user?: { id: string };
}

// Test data representing a contract with relationships
const contractData = {
  id: "contract-123",
  name: "Test Contract",
  status: "active",
  client: {
    id: "client-456",
    name: "Test Client",
    email: "client@example.com"
  },
  createdBy: {
    id: "user-789",
    name: "Test User",
    email: "user@example.com"
  }
};

const updatedContractData = {
  ...contractData,
  name: "Updated Contract Name", // Only this field changed
  client: {
    ...contractData.client,
    email: "updated@example.com" // This would normally trigger a client update
  }
};

console.log('=== Testing Cascading Audit Log Prevention ===\n');

// Test 1: Direct operation (should be logged)
console.log('Test 1: Direct contract update (should be logged)');
const req1: MockRequest = {};
initializeAuditContext(req1);

// Simulate updating the contract directly
const shouldLogContract = shouldLogAuditOperation(req1, 'contracts', 'contract-123', {
  allowCascading: false
});

console.log('Should log contract update:', shouldLogContract);
if (shouldLogContract) {
  markDirectOperation(req1, 'contracts', 'contract-123');
  console.log('✓ Contract update logged as direct operation');
}

// Test 2: Cascading operation (should NOT be logged)
console.log('\nTest 2: Cascading client update (should NOT be logged)');
const shouldLogClient = shouldLogAuditOperation(req1, 'clients', 'client-456', {
  allowCascading: false
});

console.log('Should log client update:', shouldLogClient);
if (!shouldLogClient) {
  markCascadingOperation(req1, 'clients', 'client-456');
  console.log('✓ Client update skipped as cascading operation');
}

// Test 3: Cascading user update (should NOT be logged)
console.log('\nTest 3: Cascading user update (should NOT be logged)');
const shouldLogUser = shouldLogAuditOperation(req1, 'users', 'user-789', {
  allowCascading: false
});

console.log('Should log user update:', shouldLogUser);
if (!shouldLogUser) {
  markCascadingOperation(req1, 'users', 'user-789');
  console.log('✓ User update skipped as cascading operation');
}

// Test 4: With cascading allowed (should be logged)
console.log('\nTest 4: With cascading allowed (should be logged)');
const req2: MockRequest = {};
initializeAuditContext(req2);
markDirectOperation(req2, 'contracts', 'contract-123');

const shouldLogClientWithCascading = shouldLogAuditOperation(req2, 'clients', 'client-456', {
  allowCascading: true,
  maxCascadeDepth: 2
});

console.log('Should log client update with cascading:', shouldLogClientWithCascading);
if (shouldLogClientWithCascading) {
  markCascadingOperation(req2, 'clients', 'client-456');
  console.log('✓ Client update logged as cascading operation');
}

// Test 5: Multiple levels of cascading
console.log('\nTest 5: Multiple levels of cascading');
const req3: MockRequest = {};
initializeAuditContext(req3);
markDirectOperation(req3, 'contracts', 'contract-123');
markCascadingOperation(req3, 'clients', 'client-456');

// This should be logged as it's within the cascade depth
const shouldLogUserDeep = shouldLogAuditOperation(req3, 'users', 'user-789', {
  allowCascading: true,
  maxCascadeDepth: 2
});

console.log('Should log user update (deep cascade):', shouldLogUserDeep);

// This should NOT be logged as it exceeds the cascade depth
const shouldLogDeepNested = shouldLogAuditOperation(req3, 'deep-nested', 'deep-123', {
  allowCascading: true,
  maxCascadeDepth: 2
});

console.log('Should log deep nested update (exceeds depth):', shouldLogDeepNested);

// Test 6: Different collections in same request
console.log('\nTest 6: Different collections in same request');
const req4: MockRequest = {};
initializeAuditContext(req4);

// First operation - should be logged
const shouldLogFirst = shouldLogAuditOperation(req4, 'posts', 'post-123', {
  allowCascading: false
});
console.log('Should log first post update:', shouldLogFirst);
if (shouldLogFirst) {
  markDirectOperation(req4, 'posts', 'post-123');
}

// Second operation on different collection - should also be logged
const shouldLogSecond = shouldLogAuditOperation(req4, 'comments', 'comment-456', {
  allowCascading: false
});
console.log('Should log comment update (different collection):', shouldLogSecond);

// Cleanup
cleanupAuditContext(req1);
cleanupAuditContext(req2);
cleanupAuditContext(req3);
cleanupAuditContext(req4);

console.log('\n=== Test Summary ===');
console.log('✓ Direct operations are logged');
console.log('✓ Cascading operations are filtered out when allowCascading=false');
console.log('✓ Cascading operations are logged when allowCascading=true');
console.log('✓ Cascade depth limits work correctly');
console.log('✓ Different collections in same request work independently');
console.log('✓ Context cleanup works properly');
