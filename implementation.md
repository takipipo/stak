Technical Implementation
==

The service will make use of DynamoDB single-table design for low cost, and low-latency persistent storage. This design will save the message as follows to serve both query & redaction while keep counting efficient. The schema is only addressing the core logic of how the persistent is being made. Some of the aspect can be enhanced with the help or Redis. e.g. Settings, and Stats Object.

## Main Schema (Table)

Table | Record Type  | Partition Key                          | Sort Key           | **Note**
------|--------------|----------------------------------------|--------------------|---------------------------------------
Table | Settings     | t#<tenant_key>                         | st#tenant_settings | Storing all tenant settings
Table | Inbox Config | t#<tenant_key>                         | si#<inbox_key>     | Storing per inbox configs, including message's schema
Table | Message      | t#<tenant_key>U#<user_id>#<inbox_key>  | m#<message_id>     | Storing **user messages**, and **public messages** with { `readat`, `expiredat` } fields only }
Table | Message      | t#<tenant_key>G#$public#<inbox_key>    | m#<message_id>     | Storing public messages (same set of fields as per user messages without `readat` field).
Table | Stats        | t#<tenant_key>U#<user_id>#<inbox_key>  | c#*                | Storing user messages count, read messages count { `published`: number, `read`: number }
Table | Stats        | t#<tenant_key>G#$public#<inbox_key>    | c#*                | Storing all messages ever published count, expired messages count { `published`: number }
Table | Stats        | t#<tenant_key>U#<user_id>#<inbox_key>  | c#<category_key>   | Storing unread messages count per category

Please see [Single Table Design](./single-table-design.md) for more information regarding the Key's design aspect.

> **IMPORTANT**
>
> - `<tenant_key>`, `<user_id>`, and `<inbox_key>` MUST not include `#` sign.
> - `<message_id>` is sortable by as it derived the prefix value from timestamp using base36 value.
> - in term of user's `<message_id>` is a string that only valid when combined with uid to create uniquness of receipient. Meaning User A & User B would shared the same message id if message were sent in batch. However receipt marker is always dedicated per single user.

## Objects

### Message (& Read Receipt) Object

* Message is TTL enabled. Hence `expiredat` is defined.
* Schema - please see follows

```json
{
    "kind": "UM", // User Message
    "audiences": {
        "id": string, // message id
        "host_system_id": string | null, // custom id from host system
        "sender": string, // message sender (`admin_id`)
        "audiences": {
            "kind": "users" | "everyone",
            "label": string, // label of users group if needed, This can be display in the message as well.
            "uids": string[], // List of `user_id` (only defined when "kind" == "users")
        },
        "received": number, // epoch since message received into Stak system
        "delivered:" number, // epoch since message delivered into our database
    },
    "readat": number | null, // epoch when message was read
    "expiredat": number, // epoch when message can be safely terminated from persistant storage (max=730d, default=inbox.ttl[type] | inbox.tll[default] | tenant.ttl | 30d)
    "taxonomy": { // groupping conditioning
        "category": string, // application's defined key, e.g. use this to derive icon.
    },
    "message": {
        "title": string,
        "body": string | any // provide any message structure you need.
        "cta_uri": string | null // provide standard URI for app to perform call to action if needed.
    },
    // Keys
    "tenant_key": string,
    "inbox_key": string,
    "uid": string,
}
```

#### Read Receipt Object

What's Read Receipt object? when a message has been read it must be marked as read. The aspect of "mark as read"-able. is what's refers to as **read receipt**.

The read receipt is always per user basis. However in complex situation like a public message (where the message is stored in separate list, the read receipt will be initialized only when needed) this suits the dynamodb as we leverage single-table design hence all tables can simply shared the schema and fields.

Read Receipt therefore is a light concept of receipt represent the mark of read. 

```json
{
    "taxonomy": { // optional field.
        "category": string, // this is a key for category.
    },
    "readat": number, // this is now mandatory to deem itself as read receipt.
    "expiredat": number, // this is mandatory as read marker should be removed when expired.
}
```

This mark of read once exist in database it should add the `read` count in the users' [stats object](#stats-object). And hence once removed (due to `expiredat` or TTL) the `read` count must be deducted as well. (we achieve this via DynamoDB Stream)

Upon marking as read we will need to set `taxonomy` and `expiredat` which derived the value from the original public message.

### Stats Object

Object is Cachable (proxied)

Stats Object exists in 2 flavors. Public, and User. Both uses the same message schema.

```json
{
    "kind": "US", // (User Stats)
    "read": number, // total read count (would be undefined for user $public)
    "published": number, // total number published
    // Keys
    "tenant_key": string,
    "inbox_key": string,
    "uid": string,
}
```

This object can be proxied. e.g. using `Redis` to maintain the value per its key instead. And regulary sync it to the Persistent

### Tenant Settings Object

Object is Cachable

```json
{
    "kind": "TS", // Tenant's Settings
    "title": string, // name of the tenant
    "ttl": string, // string defined the default TTL for messages produced 30d, 300m, 6000s (max 720d)
    // Keys
    "tenant_key": string,
    "uid": string,
}
```

### Inbox Configuration Object

Object is Cachable

```json
{
    "kind": "IC", // Inbox's Config
    "title": string, // inbox's title.
    "description": string, // inbox's description (title)
    "ttl": {
        "default": stirng, // duration in units of days, minutes, and seconds. e.g. 30d, 30m, 600s
        "<type>": string // duration in units of days, minutes, and seconds.
    },
    // Keys
    "tenant_key": string,
    "inbox_key": string,
    "uid": string,
}
```
## Optimized Read

As we are to support **broadcast** messages to every single users as well -- we will have to avoid heavy write operations. (Posting same messages to every single users). To avoid this we prefer **Optimized Read** operations instead. To do that **Read operations** the messages are to be selected from 2 sources of the same tables one is from public messages, and another is per user messages.

1. Per User Message (by specific user_id)
1. Public Messages (by G#$public, these messages are to be merged with each user's feed)

These 2 list will then merged and reply to API callback.

### Side effect of optimized read.

1. Estimated number of messages is now more complicated. Please see the implementation details of Estimated Count.
2. `readat` per public messages need to be collected in different fashion.

## Marking Message as Read

### Marking one User Message as Read

Marking Message as read is actually straight forward. It will set `readat` if not yet set to a valid value. This can be leverage on DynamoDB's update expression `if_not_exists` and force it to return `ALL_OLD` attributes. And if the returned has `readat` as undefined. This would mean the changes is legit. And hence we can increment the `user.read` count in stats object.

### Marking one Public Message as Read

Similar to Marking one User Message as Read; We can use similar `message` structure as a `read_receipt` instead. To do this we will basically attempt to set `readat` and `expiredat` to the message sorting. If the message was properly set (returning `ALL_OLD` as `readat` undefined) that would means we can now add +1 to the `user.read` count in stats object as well.

### Marking all Message (Since) as Read

TBD

## Expiration of Message & Read Receipt

DynamoDB document can be marked as expirable via its' [TTL feature](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html). Along with [DynamoDB Stream](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-streams.html). we can then achieve the event capturing so that we can update the Estimated count easily.

### Expiration of User Message (ignore the fact that it has read-receipt)

For user message reduce the **published message count** in user stats..

### Expiration of User Read Receipt

For user's read-receipt reduce the **read message count** in user stats..

### Expiration of Public Message (no read receipt)

For public read-receipt reduce the **read message count** in user stats..

### Combined worker psudo logic

Here is the combined logic

```ts
/**
 * an interface derived from the expected fields to be handled by DynamoDB Stream message lambda.
 * (Filtered for Delete Operation, and document's kind == 'UM')
 */
interface ExpiredMessageDocument {
    kind: 'UM' | 'US' | 'TS' | 'IC',
    headers?: { audiences: { kind: 'everyone' | 'users' } }
    readat?: number
    expiredat: number
    uid: string | '$public'
    inbox_key: string
    tenant_key: string
}

function onDocumentExpired(deletedDoc: ExpiredMessageDocument) {
    const { headers, readat, uid, inbox_key, tenant_key } = deletedDoc
    const changes = []
    if (headers) {
        // Actual User Message or Public Message
        if (headers.audiences.kind === 'everyone') {
            // EXPECTED THAT uid === '$public'
            // public message
            changes.push(updatePublicPublishedCount(tenant_key, inbox_key, -1))
        } else {
            // user message
            changes.push(updateUserPublishedCount(tenant_key, uid, inbox_key, -1))
        }
    }

    // for read-receipt
    if (readat) {
        if (uid === '$public') {
            throw new Error('Impossible!')
        }
        // in the name of read-receipt
        changes.push(updateUserReadCount(tenant_key, uid, inbox_key, -1))
    }
    // Flush changes onto DB
    await executeChanges(changes)
}
```

## Estimated Count

Number of messages will be incremented per user's state, and per uses' group via [UpdateExpressions](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html)

### Adding user message

Given a message.

> UPDATE(t#<tenant_key>U#<user_id>#<inbox_key>, c#*) ADD published, 1
> UPDATE(t#<tenant_key>U#<user_id>#<inbox_key>, c#<category_key>) ADD published, 1

### Adding public message

Given publishing a public message.

> UPDATE(t#<tenant_key>U#<user_id>#<inbox_key>, c#*) ADD published, 1
> UPDATE(t#<tenant_key>U#<user_id>#<inbox_key>, c#<category_key>) ADD published, 1

