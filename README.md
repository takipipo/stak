Stak
==

Stak is an Opensource Application for handling Inbox usecase of mobile application.

Core Feature 

- **For User (Account) Layer** - store per user's messages and provided ultra fast API to query messages by user basis. Allow user to mark messages as 'read'.
- **For Service Layer** - The Application also provide an admin API that help service layer to broadcast message per group of audiences. (your `uid`s). Or batch messaging.

Message Custom Schema

Message schema can be extended. Default schema is provided as following. Each message is stored within specific **Tenant** represented by `tenant_key` and specific inbox represent by `inbox_key` default is "DEFAULT". These key information is omitted from the response payload to save transfer.

```json
{
    "headers": {
        "id": string, // message id
        "host_system_id": string |null, // custom id from host system
        "category": string, // application's defined key, e.g. use this to derive icon?
        "sender": string, // message sender (`admin_id`)
        "audiences": {
            "kind": "users" | "everyone",
            "label": string, // label of users group if needed, This can be display in the message as well.
            "uids": string[], // List of `user_id` (only defined when "kind" == "users")
        },
        "received": number, // epoch since message received into Stak system
        "delivered:" number, // epoch since message delivered into our database
        "readat": number | null, // epoch when message was read
    },
    "message": {
        "title": string,
        "body": string | any // provide any message structure you need.
        "cta_uri": string | null // provide standard URI for app to perform call to action if needed.
    }
}
```

- Message can be group using categorization parameter such as `category` this category is used to distinct message within the same **inbox**.
- Message body can be custom json. Schema can be used to help speec up message parsing.

## Inbox Configurations

```json
{
    "title": string, // inbox's title.
    "description": string, // inbox's description (title)
}
```

# Invoking our APIs

Stak offer 2 groups of APIs.

1. Admin APIs
1. User APIs

Both APIs offer different set of functionality see detail of each.

## Admin APIs

### Authentication

For Admin APIs we have only server-to-server comminication.

To invoke these API you will need the `AdminApiKey` and `admin_id`

### Send Messages

```bash
POST /stack/admin/v1/:tenant_key/:inbox_key/messages/post
{
    "headers": {
        "host_system_id": string, // application's defined id.
        "category": string, // application's defined key, e.g. use this to derive icon?
        "audiences": { /** Same as Audience object on Message Schema */
            "kind": "users" | "everyone",
            "label": string, // label of users group if needed, This can be display in the message as well.
            "uids": string[], // List of `user_id` (only defined when "kind" == "users")
        },
    }
    "message": {
        "title": string,
        "body": string | any // provide any message structure you need.
        "cta_uri": string | null // provide standard URI for app to perform call to action if needed.
    }
}
```

Responses

```json
{
    "success": true,
    "data": {
        "id": "<message_id>",
        "estimate_receipient": number,
    }
}
```

### Redact Sent Message

```bash
DELETE /stack/admin/v1/:tenant_key/:inbox_key/messages/redact
{
    "id": <message_id>
}
```

Responses

```json
{
    "success": true,
    "data": {
        "id": "<message_id>",
        "estimate_receipient": number,
    }
}
```

## User APIs

### Authentication

For assuming a user. Our APIs offers 2 topologies.

1. From Device API Call - Your Mobile App call your Stak endpoints Directly with our `user_token`. Your authentication service must call our backend to issue a user token when needed. Then each device can use such token to make the calls. (Refresh Token is also available).
1. From Server API Call - Your Mobile App call your backend, your backend call Stak endpoints with `UserApiKey` + `user_id`

### Query List message

Query last <limit> messages

Request

```bash
GET /stack/users/v1/:tenant_key/:inbox_key/messages/last/:limit?next=:next_token
```

Responses

```json
{
    "success": true,
    "paging": {
        "estimate_count": 120,
        "count": 30,
        "next_token": string
    },
    "messages": [
        { ...message_json... },
        { ...message_json... },
        { ...message_json... },
        ...27 more messages...,
    ],
}
```


### Mark as Read

Mark specific messages as read.

Request

```bash
PUT /stack/users/v1/:tenant_key/:inbox_key/messages/read/
{
    "messages": [<message_id>, <message_id>], // maximum 50 messages.
}
```

Responses

```json
{
    "success": true,
    "receipts": [
        { "id": <message_id>, "readat": epoch },
        { "id": <message_id>, "readat": epoch },
        { "id": <message_id>, "readat": epoch },
    ]
}
```

### Mark all as Read

Mark specific messages as read.

Request

```bash
PUT /stack/users/v1/:tenant_key/:inbox_key/messages/read/
{
    "after": epoch, // epoch that will mark the earlier than this epoch as read.
}
```

Responses

```json
{
    "success": true,
    "receipts": {
        "id": <message_id> // the maxium message id that was marked as read. (Any greater message id consider not-effected).
    },
}
```

# Technical Implementation

The service will make use of DynamoDB single-table design for low cost and high-latency persistent storage.

This design will save the message as follows to serve both query & redaction.

**IMPORTANT** Auto generate message id is a string that only valid when combined with uid to create uniquness of receipient. Meaning User A & User B would shared the same message id if message were sent in batch. However receipt marker is always dedicated per single user.

## Main Schema (Table)

Table | Record Type  | Partition Key                          | Sort Key           | **Note**
------|--------------|----------------------------------------|--------------------|---------------------------------------
Table | Settings     | t#<tenant_key>                         | st#tenant_settings | Storing all tenant settings
Table | Inbox Config | t#<tenant_key>                         | si#<inbox_key>     | Storing per inbox configs, including message's schema
Table | Message      | t#<tenant_key>U#<user_id>#<inbox_key>  | m#<message_id>     | Storing messages
Table | Stats        | t#<tenant_key>U#<user_id>#<inbox_key>  | c#*                | Storing all unread messages count
Table | Stats        | t#<tenant_key>U#<user_id>#<inbox_key>  | c#<category_id>    | Storing unread messages count per category

> IMPORTANT: `<tenant_key>`, `<user_id>`, and `<inbox_key>` MUST not include `#` sign.

## Technnology Stack

- monorepo
- Lambda via Serverless (v3) Framework
- TypeScript
- Message Queue - SQS
- Development Simulation
    - using Serverless Offline
    - LocalStack
- Persistent: DynamoDB (Single Table Design)
