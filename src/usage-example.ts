/**
 * Example usage of the enhanced Payload Audit Log plugin with cascading prevention.
 * This demonstrates how to configure the plugin to prevent cascading audit logs
 * when updating documents with relationships.
 */

import { auditLogPlugin, AuditLogOptions } from './index';

// Example 1: Basic configuration with cascading prevention (recommended)
const basicConfig: AuditLogOptions = {
  collections: ['contracts', 'clients', 'users', 'school-groups'],
  includeAuth: true,
  columnsToIgnore: ['updatedAt', 'lastLogin'],
  allowCascading: false, // Prevent cascading logs
  changeFormatter: {
    excludeFields: ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
    meaningfulChangesOnly: true,
    maxDepth: 5
  }
};

// Example 2: Configuration with limited cascading (for debugging)
const limitedCascadingConfig: AuditLogOptions = {
  collections: ['contracts', 'clients', 'users', 'school-groups'],
  includeAuth: true,
  columnsToIgnore: ['updatedAt', 'lastLogin'],
  allowCascading: true, // Allow cascading logs
  maxCascadeDepth: 1, // But limit to 1 level deep
  changeFormatter: {
    excludeFields: ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
    meaningfulChangesOnly: true,
    maxDepth: 5
  }
};

// Example 3: Full cascading for comprehensive logging
const fullCascadingConfig: AuditLogOptions = {
  collections: ['contracts', 'clients', 'users', 'school-groups'],
  includeAuth: true,
  columnsToIgnore: ['updatedAt', 'lastLogin'],
  allowCascading: true, // Allow all cascading logs
  maxCascadeDepth: 10, // Deep cascading allowed
  changeFormatter: {
    excludeFields: ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
    meaningfulChangesOnly: true,
    maxDepth: 5
  }
};

// Example 4: Minimal configuration for specific collections only
const minimalConfig: AuditLogOptions = {
  collections: ['contracts'], // Only track contracts
  allowCascading: false, // No cascading
  changeFormatter: {
    excludeFields: ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy'],
    meaningfulChangesOnly: true,
    maxDepth: 3
  }
};

console.log('=== Payload Audit Log Plugin Configuration Examples ===\n');

console.log('1. Basic Configuration (Recommended):');
console.log('   - Prevents cascading audit logs');
console.log('   - Only logs direct user operations');
console.log('   - Reduces noise in audit logs');
console.log('   - Configuration:', JSON.stringify(basicConfig, null, 2));
console.log('\n');

console.log('2. Limited Cascading Configuration:');
console.log('   - Allows 1 level of cascading logs');
console.log('   - Useful for debugging relationship updates');
console.log('   - Configuration:', JSON.stringify(limitedCascadingConfig, null, 2));
console.log('\n');

console.log('3. Full Cascading Configuration:');
console.log('   - Allows all cascading logs');
console.log('   - Comprehensive audit trail');
console.log('   - May create many logs for complex updates');
console.log('   - Configuration:', JSON.stringify(fullCascadingConfig, null, 2));
console.log('\n');

console.log('4. Minimal Configuration:');
console.log('   - Only tracks specific collections');
console.log('   - No cascading logs');
console.log('   - Lightweight audit logging');
console.log('   - Configuration:', JSON.stringify(minimalConfig, null, 2));
console.log('\n');

console.log('=== How to Use in Your Payload Config ===\n');

console.log('```typescript');
console.log('import { auditLogPlugin } from "./path/to/payload-audit-log";');
console.log('');
console.log('export default buildConfig({');
console.log('  // ... your other config');
console.log('  plugins: [');
console.log('    auditLogPlugin({');
console.log('      collections: ["contracts", "clients", "users"],');
console.log('      allowCascading: false, // Prevent cascading logs');
console.log('      changeFormatter: {');
console.log('        excludeFields: ["id", "createdAt", "updatedAt"],');
console.log('        meaningfulChangesOnly: true');
console.log('      }');
console.log('    })');
console.log('  ]');
console.log('});');
console.log('```\n');

console.log('=== Benefits of Cascading Prevention ===\n');
console.log('✓ Reduces audit log noise significantly');
console.log('✓ Only logs actual user-initiated changes');
console.log('✓ Prevents duplicate logs for relationship updates');
console.log('✓ Improves performance by reducing database writes');
console.log('✓ Makes audit logs more meaningful and actionable');
console.log('✓ Configurable depth limits for debugging when needed');
