import { formatChanges, createChangeSummary, shouldLogChanges } from './change-formatter';
import { describe, expect,test } from "vitest";

describe('Change Formatter', () => {
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

  test('should detect basic changes', () => {
    const changes = formatChanges(newDocument, oldDocument);
    expect(changes).toBeDefined();
    expect(createChangeSummary(changes)).toBeDefined();
    expect(shouldLogChanges(changes)).toBe(true);
  });

  test('should filter out excluded fields with meaningful changes only', () => {
    const changes = formatChanges(newDocument, oldDocument, {
      meaningfulChangesOnly: true,
      excludeFields: ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']
    });
    
    expect(changes).toBeDefined();
    expect(createChangeSummary(changes)).toBeDefined();
    expect(shouldLogChanges(changes)).toBe(true);
  });

  test('should include all changes when meaningfulChangesOnly is false', () => {
    const changes = formatChanges(newDocument, oldDocument, {
      meaningfulChangesOnly: false,
      excludeFields: ['id', 'createdAt', 'createdBy', 'updatedBy']
    });
    
    expect(changes).toBeDefined();
    expect(createChangeSummary(changes)).toBeDefined();
    expect(shouldLogChanges(changes)).toBe(true);
  });

  test('should not log changes when only excluded fields change', () => {
    const changes = formatChanges(newDocument, oldDocument, {
      meaningfulChangesOnly: true,
      excludeFields: ['id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy', 'name']
    });
    
    expect(changes).toBeDefined();
    expect(createChangeSummary(changes)).toBeDefined();
    expect(shouldLogChanges(changes)).toBe(false);
  });

  test('should handle array changes', () => {
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
    
    expect(arrayChanges).toBeDefined();
    expect(createChangeSummary(arrayChanges)).toBeDefined();
    expect(shouldLogChanges(arrayChanges)).toBe(true);
  });

  test('should handle nested object changes', () => {
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
    
    expect(nestedChanges).toBeDefined();
    expect(createChangeSummary(nestedChanges)).toBeDefined();
    expect(shouldLogChanges(nestedChanges)).toBe(true);
  });

  test('should return null for identical documents', () => {
    const changes = formatChanges(oldDocument, oldDocument);
    expect(changes).toBeNull();
  });

  test('should handle empty objects', () => {
    const changes = formatChanges({}, {});
    expect(changes).toBeNull();
  });

  test('should handle null/undefined values', () => {
    const changes = formatChanges({ value: null }, { value: undefined });
    expect(changes).toBeDefined();
  });
});