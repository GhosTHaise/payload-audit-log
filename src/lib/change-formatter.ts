/**
 * Helper functions for formatting audit log changes in a more meaningful way.
 */

/**
 * Configuration options for change formatting.
 */
export interface ChangeFormatterOptions {
  /**
   * Fields to exclude from change comparison.
   */
  excludeFields?: string[];
  
  /**
   * Whether to include only meaningful changes (exclude unchanged nested objects).
   */
  meaningfulChangesOnly?: boolean;
  
  /**
   * Maximum depth for nested object comparison.
   */
  maxDepth?: number;
}

/**
 * Default options for change formatting.
 */
export const defaultChangeFormatterOptions: ChangeFormatterOptions = {
  excludeFields: [
    'id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 
    'sessions', 'password', 'token', 'secret', 'hash', 'salt',
    'lockUntil', 'loginAttempts', 'resetPasswordToken', 'resetPasswordExpiration',
    'lastLogin', 'lastLoginAt', 'emailVerified', 'emailVerificationToken',
    'emailVerificationExpiration', 'forgotPasswordToken', 'forgotPasswordExpiration'
  ],
  meaningfulChangesOnly: true,
  maxDepth: 2
};

/**
 * Checks if a field is a relationship field by analyzing the value structure
 */
function isRelationshipField(key: string, value: any): boolean {
  // Check if value looks like a relationship (has id property or is a string ID)
  if (typeof value === 'string' && isUUID(value)) {
    return true;
  }
  
  if (typeof value === 'object' && value !== null && 'id' in value) {
    return true;
  }
  
  // Check if it's an array of relationships
  if (Array.isArray(value) && value.length > 0) {
    // If all items in the array are either strings (IDs) or objects with id property
    return value.every(item => 
      (typeof item === 'string' && isUUID(item)) ||
      (typeof item === 'object' && item !== null && 'id' in item)
    );
  }
  
  return false;
}

/**
 * Checks if a string is a UUID (supports various formats)
 */
function isUUID(str: string): boolean {
  // Standard UUID format: 8-4-4-4-12
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Also support other common ID formats (MongoDB ObjectId, etc.)
  const objectIdRegex = /^[0-9a-f]{24}$/i;
  // Generic ID pattern (alphanumeric with some length)
  const genericIdRegex = /^[a-zA-Z0-9_-]{8,}$/;
  
  return uuidRegex.test(str) || objectIdRegex.test(str) || genericIdRegex.test(str);
}

/**
 * Checks if two values are deeply equal, with configurable depth limit.
 */
function deepEqual(a: any, b: any, depth: number = 0, maxDepth: number = 5): boolean {
  if (depth > maxDepth) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  
  if (a === b) {
    return true;
  }
  if (a == null || b == null) {
    return a === b;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) {
      return false;
    }
    
    if (Array.isArray(a)) {
      if (a.length !== b.length) {
        return false;
      }
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i], depth + 1, maxDepth)) {
          return false;
        }
      }
      return true;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) {
      return false;
    }
    
    for (const key of keysA) {
      if (!keysB.includes(key)) {
        return false;
      }
      if (!deepEqual(a[key], b[key], depth + 1, maxDepth)) {
        return false;
      }
    }
    
    return true;
  }
  
  return false;
}

/**
 * Extracts meaningful changes from nested objects, excluding unchanged parts.
 */
function extractMeaningfulChanges(
  newValue: any, 
  oldValue: any, 
  depth: number = 0, 
  maxDepth: number = 5,
  excludeFields: string[] = []
): any {
  if (depth > maxDepth) {
    return null; // Don't include deep nested objects
  }
  
  // If values are equal, return null to indicate no change
  if (deepEqual(newValue, oldValue, depth, maxDepth)) {
    return null;
  }
  
  // If either value is null/undefined, return the new value
  if (newValue == null || oldValue == null) {
    return newValue;
  }
  
  // If not objects, return the new value
  if (typeof newValue !== 'object' || typeof oldValue !== 'object') {
    return newValue;
  }
  
  // Handle arrays - only show if length changed or items are different
  if (Array.isArray(newValue) && Array.isArray(oldValue)) {
    if (newValue.length !== oldValue.length) {
      return newValue;
    }
    
    // For arrays, check if IDs changed (for relationship arrays)
    const newIds = newValue.map(item => typeof item === 'string' ? item : item?.id).filter(Boolean);
    const oldIds = oldValue.map(item => typeof item === 'string' ? item : item?.id).filter(Boolean);
    
    // If both arrays have the same IDs, don't show as changed
    if (newIds.length === oldIds.length && newIds.every(id => oldIds.includes(id))) {
      return null;
    }
    
    // For arrays, only show if there are actual content changes
    const hasChangedItems = newValue.some((item, index) => {
      const oldItem = oldValue[index];
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        return item !== oldItem;
      }
      // For objects in arrays, check if they're different
      return !deepEqual(item, oldItem, depth + 1, maxDepth);
    });
    
    return hasChangedItems ? newValue : null;
  } else if (Array.isArray(newValue) || Array.isArray(oldValue)) {
    return newValue;
  }
  
  const result: any = {};
  let hasChanges = false;
  
  const allKeys = Array.from(new Set([...Object.keys(newValue), ...Object.keys(oldValue)]));
  
  for (const key of allKeys) {
    // Skip excluded fields
    if (excludeFields.includes(key)) {
      continue;
    }
    
    const newVal = newValue[key];
    const oldVal = oldValue[key];
    
    // Simple relationship detection: if one is string ID and other is object with same ID, skip
    if ((typeof newVal === 'string' && typeof oldVal === 'object' && oldVal?.id === newVal) ||
        (typeof oldVal === 'string' && typeof newVal === 'object' && newVal?.id === oldVal)) {
      continue;
    }
    
    // For known relationship fields, only show if the ID changed
    if (isRelationshipField(key, newVal) || isRelationshipField(key, oldVal)) {
      const newId = typeof newVal === 'string' ? newVal : newVal?.id;
      const oldId = typeof oldVal === 'string' ? oldVal : oldVal?.id;
      
      // Only log if the ID actually changed
      if (newId && oldId && newId !== oldId) {
        result[key] = {
          old: oldId,
          new: newId
        };
        hasChanges = true;
      }
      continue;
    }
    
    const change = extractMeaningfulChanges(newVal, oldVal, depth + 1, maxDepth, excludeFields);
    
    if (change !== null) {
      result[key] = change;
      hasChanges = true;
    }
  }
  
  return hasChanges ? result : null;
}

/**
 * Formats changes for audit logging, showing only meaningful differences.
 * 
 * @param newDoc - The new document state
 * @param oldDoc - The previous document state
 * @param options - Configuration options for formatting
 * @returns Formatted changes object or null if no meaningful changes
 */
export function formatChanges(
  newDoc: any, 
  oldDoc: any, 
  options: ChangeFormatterOptions = {}
): Record<string, any> | null {
  const opts = { ...defaultChangeFormatterOptions, ...options };
  
  if (!oldDoc) {
    return newDoc;
  }
  
  const changes: Record<string, any> = {};
  let hasAnyChanges = false;
  
  // Get all unique keys from both documents
  const allKeys = Array.from(new Set([...Object.keys(newDoc), ...Object.keys(oldDoc)]));
  
  for (const key of allKeys) {
    // Skip excluded fields
    if (opts.excludeFields?.includes(key)) {
      continue;
    }
    
    const newValue = newDoc[key];
    const oldValue = oldDoc[key];
    
    // Simple relationship detection: if one is string ID and other is object with same ID, skip
    if ((typeof newValue === 'string' && typeof oldValue === 'object' && oldValue?.id === newValue) ||
        (typeof oldValue === 'string' && typeof newValue === 'object' && newValue?.id === oldValue)) {
      continue;
    }
    
    if (opts.meaningfulChangesOnly) {
      const meaningfulChange = extractMeaningfulChanges(
        newValue, 
        oldValue, 
        0, 
        opts.maxDepth || 5, 
        opts.excludeFields || []
      );
      
      if (meaningfulChange !== null) {
        changes[key] = {
          old: oldValue,
          new: meaningfulChange
        };
        hasAnyChanges = true;
      }
    } else if (!deepEqual(newValue, oldValue, 0, opts.maxDepth || 5)) {
      // Simple comparison
      changes[key] = {
        old: oldValue,
        new: newValue
      };
      hasAnyChanges = true;
    }
  }
  
  return hasAnyChanges ? changes : null;
}

/**
 * Creates a simplified change summary for better readability.
 * 
 * @param changes - The changes object from formatChanges
 * @returns A simplified summary of changes
 */
export function createChangeSummary(changes: Record<string, any> | null): string {
  if (!changes) {
    return 'No changes';
  }
  
  const changeCount = Object.keys(changes).length;
  const fields = Object.keys(changes).join(', ');
  
  return `${changeCount} field(s) changed: ${fields}`;
}

/**
 * Validates if changes are meaningful enough to log.
 * 
 * @param changes - The changes object
 * @param minChanges - Minimum number of changes required
 * @returns Whether changes should be logged
 */
export function shouldLogChanges(
  changes: Record<string, any> | null, 
  minChanges: number = 1
): boolean {
  if (!changes) {
    return false;
  }
  
  const changeCount = Object.keys(changes).length;
  return changeCount >= minChanges;
}
