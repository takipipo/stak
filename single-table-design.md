Single-Table Design Documentation
==

This document describes the DynamoDB single-table design for the Stak messaging system, optimized for multi-tenant inbox functionality with high performance and cost efficiency.

## 1. Access Patterns

The Stak system supports the following primary access patterns:

### Admin API Access Patterns

1. **Send Message to Specific Users**
   - Query: Write message records for each target user
   - API: `POST /stack/admin/v1/:tenant_key/:inbox_key/messages/post`
   - Psudo Tasks
     - **Fetch** settings per tenant. (Can be cached)
     - **Fetch** configuration per tenant + inbox (Can be cached).
     - Create a message, get the `message_id`
     - Compute number of recipients
     - Send message (including all payload, chunked target uids into maximum of 100 uids per chunk) into delivery workers via SQS.
     - On the delivery worker:
         - Insert record into Database.
         - Update (increment) unreadcount per tenant_key + inbox_key

2. **Send Message to Everyone**
   - Query: Write message records for all users in tenant/inbox
   - Pattern: `POST /stack/admin/v1/:tenant_key/:inbox_key/messages/post`
   - Psudo Tasks
     - Fetch settings per tenant. (Can be cached)
     - Fetch configuration per tenant + inbox (Can be cached).
     - Create a message, get the `message_id`
     - Esitmate number of recipients
     - Send message (including all payload, chunked target uids into maximum of 100 uids per chunk) into delivery workers via SQS.
         - Insert record into Database.
         - Update (increment) unreadcount per tenant_key + inbox_key

3. **Redact Sent Message**
   - Query: Mark message as redacted across all recipients
   - Pattern: `DELETE /stack/admin/v1/:tenant_key/:inbox_key/messages/redact`

### User API Access Patterns

1. **Query User Messages (Paginated)**
   - Query: Retrieve last N messages for a specific user/tenant/inbox
   - Pattern: `GET /stack/users/v1/:tenant_key/:inbox_key/messages/last/:limit`
   - Sort: By message timestamp (most recent first)

2. **Mark Specific Messages as Read**
   - Query: Update read status for specific message IDs
   - Pattern: `PUT /stack/users/v1/:tenant_key/:inbox_key/messages/read/`

3. **Mark All Messages as Read (by timestamp)**
   - Query: Update read status for messages before a specific timestamp
   - Pattern: `PUT /stack/users/v1/:tenant_key/:inbox_key/messages/read/`

4. **Get Unread Message Counts**
   - Query: Retrieve total and per-category unread counts
   - Required for: Badge counts, notification summaries

### Configuration Access Patterns
1. **Tenant Settings Management**
   - Query: Read/write tenant-level configurations
   - Pattern: Global tenant settings

2. **Inbox Configuration Management**
   - Query: Read/write inbox-specific configurations
   - Pattern: Per-inbox schemas and settings

## 2. Table Design

### Primary Table Structure

The system uses a single DynamoDB table with the following key structure:

| Record Type | Partition Key (PK) | Sort Key (SK) | Description |
|-------------|-------------------|---------------|-------------|
| **Tenant Settings** | `t#<tenant_key>` | `st#tenant_settings` | Global tenant configuration |
| **Inbox Config** | `t#<tenant_key>` | `si#<inbox_key>` | Per-inbox settings and schema |
| **Message** | `t#<tenant_key>U#<user_id>#<inbox_key>` | `m#<message_id>` | Individual user messages |
| **Total Stats** | `t#<tenant_key>U#<user_id>#<inbox_key>` | `c#*` | Total unread count per user/inbox |
| **Category Stats** | `t#<tenant_key>U#<user_id>#<inbox_key>` | `c#<category_key>` | Unread count per category |

### Key Design Principles

1. **Hierarchical Partitioning**: 
   - Tenant isolation at the top level
   - User-specific partitions for message queries
   - Inbox separation within user partitions

2. **Efficient Querying**:
   - Messages for a user can be queried with a single Query operation
   - Sort key enables time-based ordering and filtering
   - Stats records co-located with messages for atomic updates

3. **Shared Message IDs**:
   - Same message_id used across multiple recipients for batch messages
   - Reduces storage overhead for broadcast messages
   - Enables efficient redaction operations

### Attribute Structure

#### Message Records
```json
{
  "PK": "t#tenant123U#user456#DEFAULT",
  "SK": "m#msg789",
  "id": "msg789",
  "host_system_id": "external_id_123",
  "category": "notification",
  "sender": "admin_user",
  "audiences": {
    "kind": "users",
    "label": "Premium Users",
    "uids": ["user456", "user789"]
  },
  "received": 1640995200,
  "delivered": 1640995201,
  "readat": null,
  "message": {
    "title": "New Feature Available",
    "body": "Check out our latest feature...",
    "cta_uri": "myapp://features/new"
  }
}
```

#### Stats Records
```json
{
  "PK": "t#tenant123U#user456#DEFAULT",
  "SK": "c#*",
  "count": 15,
  "last_updated": 1640995201
}
```

#### Configuration Records
```json
{
  "PK": "t#tenant123",
  "SK": "si#DEFAULT",
  "title": "General Notifications",
  "description": "System-wide notifications",
  "schema_version": "1.0"
}
```

## 3. Local Secondary Indexes (LSI)

**Current Status**: No LSI defined in the current implementation.

**Potential LSI Considerations**:
- **LSI on Category**: Could enable querying messages by category within a user/inbox partition
- **LSI on Read Status**: Could enable efficient queries for read/unread messages
- **Trade-offs**: LSI would consume additional storage and write capacity

**Recommendation**: Evaluate LSI necessity based on query patterns. Current sort key design may be sufficient for most use cases.

## Performance Considerations

1. **Hot Partitions**: User partitions distribute load naturally across user base
2. **Burst Capacity**: Pay-per-request billing accommodates variable workloads
3. **Query Efficiency**: Single partition queries for user messages maximize performance
4. **Write Amplification**: Broadcast messages require writes to multiple partitions
5. **Atomic Operations**: Stats updates can be performed atomically with message writes using transactions

## Migration Notes

**Current Implementation Gap**: The existing `serverless.yml` defines a simple `userId`-based table, which doesn't match this design. Implementation will require:

1. Update DynamoDB table schema in `serverless.yml`
2. Implement proper partition key generation in application code
3. Update IAM permissions for new access patterns
4. Migrate existing data if any

This single-table design optimizes for the specific access patterns of an inbox messaging system while maintaining cost efficiency and scalability.
