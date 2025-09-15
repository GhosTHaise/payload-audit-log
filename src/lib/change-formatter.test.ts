import { formatChanges, createChangeSummary, shouldLogChanges } from './change-formatter';

// Test data similar to your example
const oldDocument = {
  id: "ccca90da-8a84-4154-8d56-3abbb72a2b6e",
  name: "Test Contract",
  status: "active",
  contract: {
    id: "ccca90da-8a84-4154-8d56-3abbb72a2b6e",
    files: null,
    endDate: "2026-09-14T00:00:00.000Z",
    createdAt: "2025-09-14T18:38:49.766Z",
    createdBy: null,
    startDate: "2025-09-14T00:00:00.000Z",
    updatedAt: "2025-09-14T18:38:49.766Z",
    updatedBy: {
      id: "c8ae5471-adbf-400e-a3cf-3bb46951d19f",
      role: "superadmin",
      email: "superadmin@example.com",
      title: "Mr",
      status: "active",
      isActive: true,
      lastName: "Admin",
      firstName: "Super",
      createdAt: "2025-09-14T18:38:46.543Z",
      createdBy: null,
      updatedAt: "2025-09-14T18:38:46.543Z",
      updatedBy: null,
      dateOfBirth: null,
      phoneNumber: null,
      magicLinkToken: null,
      accountDisableReason: null
    }
  },
  createdBy: {
    id: "e4d144c5-b300-404e-af56-efac7bd288c5",
    role: "user",
    email: "externatadmin@mail.ch",
    title: "Mr",
    status: "active",
    isActive: true,
    lastName: "Admin",
    firstName: "Externat",
    createdAt: "2025-09-14T18:38:49.672Z",
    createdBy: null,
    updatedAt: "2025-09-14T18:38:49.672Z",
    updatedBy: "c8ae5471-adbf-400e-a3cf-3bb46951d19f",
    dateOfBirth: null,
    phoneNumber: null,
    magicLinkToken: null,
    accountDisableReason: null
  }
};

const newDocument = {
  ...oldDocument,
  name: "Updated Contract", // Only this field changed
  contract: {
    ...oldDocument.contract,
    updatedAt: "2025-09-15T07:30:44.474Z", // Only timestamp changed
    updatedBy: {
      ...oldDocument.contract.updatedBy,
      updatedAt: "2025-09-14T18:42:47.744Z" // Only timestamp changed
    }
  },
  createdBy: {
    ...oldDocument.createdBy,
    updatedAt: "2025-09-15T07:30:43.694Z" // Only timestamp changed
  }
};

// Test the change formatter
console.log('=== Testing Change Formatter ===\n');

// Test 1: Basic change detection
console.log('Test 1: Basic change detection');
const changes1 = formatChanges(newDocument, oldDocument);
console.log('Changes detected:', changes1);
console.log('Change summary:', createChangeSummary(changes1));
console.log('Should log changes:', shouldLogChanges(changes1));
console.log('\n');

// Test 2: With meaningful changes only (default)
console.log('Test 2: With meaningful changes only (default)');
const changes2 = formatChanges(newDocument, oldDocument, {
  meaningfulChangesOnly: true,
  excludeFields: ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']
});
console.log('Changes detected:', changes2);
console.log('Change summary:', createChangeSummary(changes2));
console.log('Should log changes:', shouldLogChanges(changes2));
console.log('\n');

// Test 3: With all changes (including timestamps)
console.log('Test 3: With all changes (including timestamps)');
const changes3 = formatChanges(newDocument, oldDocument, {
  meaningfulChangesOnly: false,
  excludeFields: ['id', 'createdAt', 'createdBy', 'updatedBy']
});
console.log('Changes detected:', changes3);
console.log('Change summary:', createChangeSummary(changes3));
console.log('Should log changes:', shouldLogChanges(changes3));
console.log('\n');

// Test 4: No meaningful changes
console.log('Test 4: No meaningful changes (only timestamps)');
const changes4 = formatChanges(newDocument, oldDocument, {
  meaningfulChangesOnly: true,
  excludeFields: ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'name']
});
console.log('Changes detected:', changes4);
console.log('Change summary:', createChangeSummary(changes4));
console.log('Should log changes:', shouldLogChanges(changes4));
console.log('\n');

// Test 5: Array changes
console.log('Test 5: Array changes');
const oldArray = {
  items: [
    { id: 1, name: 'Item 1', status: 'active' },
    { id: 2, name: 'Item 2', status: 'inactive' }
  ]
};

const newArray = {
  items: [
    { id: 1, name: 'Item 1 Updated', status: 'active' },
    { id: 2, name: 'Item 2', status: 'inactive' },
    { id: 3, name: 'Item 3', status: 'active' }
  ]
};

const arrayChanges = formatChanges(newArray, oldArray, {
  excludeFields: ['id']
});
console.log('Array changes detected:', arrayChanges);
console.log('Change summary:', createChangeSummary(arrayChanges));
console.log('Should log changes:', shouldLogChanges(arrayChanges));
console.log('\n');

// Test 6: Nested object changes
console.log('Test 6: Nested object changes');
const oldNested = {
  user: {
    profile: {
      name: 'John Doe',
      email: 'john@example.com',
      settings: {
        theme: 'light',
        notifications: true
      }
    },
    preferences: ['email', 'sms']
  }
};

const newNested = {
  user: {
    profile: {
      name: 'John Smith', // Changed
      email: 'john@example.com',
      settings: {
        theme: 'dark', // Changed
        notifications: true
      }
    },
    preferences: ['email', 'sms', 'push'] // Changed
  }
};

const nestedChanges = formatChanges(newNested, oldNested, {
  excludeFields: ['id', 'createdAt', 'updatedAt']
});
console.log('Nested changes detected:', nestedChanges);
console.log('Change summary:', createChangeSummary(nestedChanges));
console.log('Should log changes:', shouldLogChanges(nestedChanges));
