# DynamoDB Single Table Design

This document describes the single-table design for the Stak inbox service, optimized for high-performance message storage and retrieval with efficient counting mechanisms.

## Design Principles

- **Single Table**: All data types stored in one DynamoDB table for cost efficiency and performance
- **Optimized Read**: Public messages stored once, read receipts created per user to avoid heavy write operations
- **Efficient Counting**: Separate stats objects maintain message counts to avoid expensive queries
- **TTL Support**: All records support expiration with automatic cleanup via DynamoDB TTL

## Table Schema Overview

| Record Type  | Partition Key                          | Sort Key           | Purpose |
|--------------|----------------------------------------|--------------------|---------|
| Settings     | `t#<tenant_key>`                       | `st#tenant_settings` | Tenant configuration |
| Inbox Config | `t#<tenant_key>`                       | `si#<inbox_key>`   | Per-inbox settings and schema |
| User Message | `t#<tenant_key>U#<user_id>#<inbox_key>` | `m#<message_id>`   | Messages targeted to specific users |
| Public Message | `t#<tenant_key>G#$public#<inbox_key>` | `m#<message_id>`   | Broadcast messages for all users |
| User Stats   | `t#<tenant_key>U#<user_id>#<inbox_key>` | `c#*`              | User's total message/read counts |
| Public Stats | `t#<tenant_key>G#$public#<inbox_key>`  | `c#*`              | Public message total counts |
| Category Stats | `t#<tenant_key>U#<user_id>#<inbox_key>` | `c#<category_key>` | Per-category unread counts |

## Key Design Constraints

- `<tenant_key>`, `<user_id>`, and `<inbox_key>` **MUST NOT** contain `#` character
- `<message_id>` is sortable using base36 timestamp prefix for chronological ordering
- Shared message IDs: Users receiving the same broadcast message share the same `message_id`
- Unique receipts: Read receipts are always per-user, even for shared messages

## Record Types and Schema

### Message Records

#### User Message (`kind: "UM"`)
```json
{
    "kind": "UM",
    "id": "string",
    "host_system_id": "string | null",
    "sender": "string",
    "audiences": {
        "kind": "users",
        "label": "string",
        "uids": ["string"]
    },
    "received": "number",
    "delivered": "number",
    "readat": "number | null",
    "expiredat": "number",
    "taxonomy": {
        "category": "string"
    },
    "message": {
        "title": "string",
        "body": "string | any",
        "cta_uri": "string | null"
    },
    "tenant_key": "string",
    "inbox_key": "string",
    "uid": "string"
}
```

#### Public Message (`kind: "UM"`)
Same schema as User Message but:
- Stored with `uid: "$public"`
- `audiences.kind: "everyone"`
- No `readat` field (read receipts stored separately)

### Read Receipt Records

When a public message is marked as read, a lightweight read receipt is created:

```json
{
    "taxonomy": {
        "category": "string"
    },
    "readat": "number",
    "expiredat": "number"
}
```

### Stats Records

#### User Stats (`kind: "US"`)
```json
{
    "kind": "US",
    "published": "number",
    "read": "number",
    "tenant_key": "string",
    "inbox_key": "string",
    "uid": "string"
}
```

#### Public Stats (`kind: "US"`)
```json
{
    "kind": "US",
    "published": "number",
    "tenant_key": "string",
    "inbox_key": "string",
    "uid": "$public"
}
```

### Configuration Records

#### Tenant Settings (`kind: "TS"`)
```json
{
    "kind": "TS",
    "title": "string",
    "ttl": "string",
    "tenant_key": "string",
    "uid": "string"
}
```

#### Inbox Configuration (`kind: "IC"`)
```json
{
    "kind": "IC",
    "title": "string",
    "description": "string",
    "ttl": {
        "default": "string",
        "<type>": "string"
    },
    "tenant_key": "string",
    "inbox_key": "string",
    "uid": "string"
}
```

## Query Patterns

### Retrieving User Messages
1. **User-specific messages**: Query `t#<tenant_key>U#<user_id>#<inbox_key>` with sort key prefix `m#`
2. **Public messages**: Query `t#<tenant_key>G#$public#<inbox_key>` with sort key prefix `m#`
3. **Merge results** chronologically using message ID sorting

### Message Counting
- **User total counts**: Query `t#<tenant_key>U#<user_id>#<inbox_key>` with sort key `c#*`
- **Category counts**: Query `t#<tenant_key>U#<user_id>#<inbox_key>` with sort key `c#<category_key>`
- **Public counts**: Query `t#<tenant_key>G#$public#<inbox_key>` with sort key `c#*`

### Configuration Lookups
- **Tenant settings**: Query `t#<tenant_key>` with sort key `st#tenant_settings`
- **Inbox config**: Query `t#<tenant_key>` with sort key `si#<inbox_key>`

## Operations

### Publishing Messages

#### User-targeted Messages
1. Store message in user partition: `t#<tenant_key>U#<user_id>#<inbox_key>`
2. Increment counts:
   - `UPDATE c#* ADD published 1`
   - `UPDATE c#<category> ADD published 1` (if categorized)

#### Public Messages (Everyone)
1. Store message once in public partition: `t#<tenant_key>G#$public#<inbox_key>`
2. Increment public stats:
   - `UPDATE c#* ADD published 1`
   - `UPDATE c#<category> ADD published 1` (if categorized)

### Marking Messages as Read

#### User Messages
1. Update message: `SET readat = :timestamp` using `if_not_exists`
2. If successful (was unread): Increment user stats `UPDATE c#* ADD read 1`

#### Public Messages
1. Create read receipt with same partition/sort key pattern
2. Set `readat` and `expiredat` using `if_not_exists`
3. If successful: Increment user stats `UPDATE c#* ADD read 1`

### TTL and Cleanup

DynamoDB TTL automatically removes expired records. DynamoDB Streams capture these deletions to update counters:

```typescript
function onDocumentExpired(deletedDoc: ExpiredMessageDocument) {
    const { headers, readat, uid, inbox_key, tenant_key } = deletedDoc
    
    if (headers) {
        // Actual message expired
        if (headers.audiences.kind === 'everyone') {
            // Public message: decrement public stats
            updatePublicPublishedCount(tenant_key, inbox_key, -1)
        } else {
            // User message: decrement user stats  
            updateUserPublishedCount(tenant_key, uid, inbox_key, -1)
        }
    }
    
    if (readat && uid !== '$public') {
        // Read receipt expired: decrement user read count
        updateUserReadCount(tenant_key, uid, inbox_key, -1)
    }
}
```

## Performance Characteristics

- **Write Efficiency**: Public messages stored once regardless of recipient count
- **Read Efficiency**: Two targeted queries per user (user + public messages)
- **Count Efficiency**: Separate stats objects avoid expensive aggregations
- **Storage Efficiency**: Single table reduces infrastructure overhead
- **Scalability**: Partition keys distribute load across user base

## Consistency Model

- **Strong Consistency**: Required for read receipt creation to prevent double-counting
- **Eventual Consistency**: Acceptable for count updates via TTL cleanup
- **Optimistic Concurrency**: Used for read receipt creation with conditional updates