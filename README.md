# PayloadCMS Audit Log Plugin

A comprehensive audit logging plugin for PayloadCMS that tracks document changes with intelligent filtering, relationship handling, and cascading prevention.

## ✨ Features

- **Smart Change Detection**: Only logs meaningful changes, excluding system fields
- **Automatic Relationship Handling**: Detects and properly handles relationship fields without noise
- **Cascading Prevention**: Prevents multiple audit logs when updating related documents
- **System Field Exclusion**: Automatically excludes sensitive fields like passwords, hashes, tokens
- **Empty Change Prevention**: Won't create audit logs for empty or meaningless changes
- **Flexible Configuration**: Extensive options for customization while maintaining sensible defaults

## 🚀 Installation

```bash
npm install @ghosthaise/payload-audit-log
```

## 📖 Basic Usage

```javascript
import { buildConfig } from "payload/config";
import { auditLogPlugin } from "@ghosthaise/payload-audit-log";

export default buildConfig({
    plugins: [
        auditLogPlugin({
            collections: ["posts", "products", "users"],
            includeAuth: true,
        }),
    ],
    // ... rest of your config
});
```

## ⚙️ Configuration Options

### Basic Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `collections` | `string[]` | `[]` | Array of collection slugs to audit |
| `includeAuth` | `boolean` | `false` | Whether to include the auth collection (users) |
| `allowCascading` | `boolean` | `false` | Allow cascading audit logs for related documents |
| `maxCascadeDepth` | `number` | `0` | Maximum depth for cascading operations |
| `allowSystemFieldOverride` | `boolean` | `false` | Allow overriding system field exclusions |

### Advanced Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columnsToIgnore` | `string[]` | See below | Fields to exclude from change comparison |
| `changeFormatter` | `object` | See below | Change formatting configuration |

### Default Excluded Fields

The plugin automatically excludes these system fields:

```javascript
[
  'id', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy',
  'sessions', 'password', 'token', 'secret', 'hash', 'salt',
  'lockUntil', 'loginAttempts', 'resetPasswordToken', 'resetPasswordExpiration',
  'lastLogin', 'lastLoginAt', 'emailVerified', 'emailVerificationToken',
  'emailVerificationExpiration', 'forgotPasswordToken', 'forgotPasswordExpiration'
]
```

## 🔧 Advanced Configuration

### Custom Field Exclusions

```javascript
auditLogPlugin({
    collections: ["posts", "products"],
    columnsToIgnore: ["customField", "internalNotes"], // Added to defaults
    changeFormatter: {
        excludeFields: ["anotherField"], // Added to defaults
        meaningfulChangesOnly: true,
        maxDepth: 3
    }
})
```

### Override System Field Exclusions

```javascript
auditLogPlugin({
    collections: ["users"],
    allowSystemFieldOverride: true,
    columnsToIgnore: ["customField"], // Only these will be excluded
    changeFormatter: {
        excludeFields: ["anotherField"] // Only these will be excluded
    }
})
```

### Cascading Control

```javascript
auditLogPlugin({
    collections: ["posts", "comments"],
    allowCascading: true,
    maxCascadeDepth: 2, // Allow up to 2 levels of cascading
})
```

## 🎯 Smart Features

### Automatic Relationship Detection

The plugin automatically detects relationship fields by analyzing data structure:

- **String IDs**: `"550e8400-e29b-41d4-a716-446655440000"`
- **Objects with ID**: `{ id: "uuid", name: "Value" }`
- **Arrays of relationships**: `[{ id: "uuid1" }, { id: "uuid2" }]`

### Intelligent Change Filtering

```javascript
// Before: Logs everything including system fields
{
  "name": { "old": "John", "new": "Jane" },
  "hash": { "old": "old-hash", "new": "new-hash" }, // System field
  "contract": { 
    "old": "uuid-123", 
    "new": { id: "uuid-123", name: "Contract" } // Same ID, populated
  }
}

// After: Only meaningful changes
{
  "name": { "old": "John", "new": "Jane" }
}
```

## 📊 Audit Log Structure

The plugin creates an `audit-logs` collection with these fields:

| Field | Type | Description |
|-------|------|-------------|
| `collection` | `string` | Name of the audited collection |
| `action` | `string` | Operation type: `create`, `update`, `delete` |
| `documentId` | `string` | ID of the document |
| `timestamp` | `date` | When the operation occurred |
| `user` | `relationship` | User who performed the operation |
| `changes` | `json` | Change details (see below) |

### Changes Field Structure

**For Create Operations:**
```json
{
  "title": "New Post",
  "content": "Post content",
  "author": "user-123"
}
```

**For Update Operations:**
```json
{
  "title": {
    "old": "Old Title",
    "new": "New Title"
  },
  "status": {
    "old": "draft",
    "new": "published"
  }
}
```

**For Delete Operations:**
```json
{
  "title": "Deleted Post",
  "content": "Post content",
  "author": "user-123"
}
```

## 🔍 Example Scenarios

### Scenario 1: User Profile Update

```javascript
// User updates their profile
const updatedUser = await payload.update({
  collection: 'users',
  id: 'user-123',
  data: {
    name: 'John Doe', // Changed
    email: 'john@example.com', // Changed
    hash: 'new-hash-value', // System field - excluded
    lastLogin: new Date() // System field - excluded
  }
});

// Audit log will only show:
{
  "name": { "old": "John", "new": "John Doe" },
  "email": { "old": "john@old.com", "new": "john@example.com" }
}
```

### Scenario 2: Post with Relationships

```javascript
// Update post with relationships
const updatedPost = await payload.update({
  collection: 'posts',
  id: 'post-123',
  data: {
    title: 'New Title', // Changed
    author: 'user-456', // Same ID, populated in response
    categories: ['cat-1', 'cat-2'], // Same IDs, populated in response
    content: 'Updated content' // Changed
  }
});

// Audit log will only show:
{
  "title": { "old": "Old Title", "new": "New Title" },
  "content": { "old": "Old content", "new": "Updated content" }
}
```

## 🛠️ Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.