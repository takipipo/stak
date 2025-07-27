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
    "taxonomy": { // groupping conditions
        "category": string, // application's defined key, e.g. use this to derive icon.
    },
    "readat": number | null, // epoch when message was read
    "expiredat": number // epoch when message can be safely terminated from persistant storage (max=730d, default=inbox.ttl[type] | inbox.tll[default] | tenant.ttl | 30d)
    "message": {
        "title": string,
        "body": string | any // provide any message structure you need.
        "cta_uri": string | null // provide standard URI for app to perform call to action if needed.
    }
}
```

- Message can be groupped using categorization parameter such as `category` this category is used to distinct message within the same **inbox**.
- Message body can be custom json. Schema can be used to help speec up message parsing.
- Message has aging. The againg is provided for reducing unwanted data cost.

## Inbox Configurations

```json
{
    "title": string, // inbox's title.
    "description": string, // inbox's description (title)
    "ttl": {
        "default": stirng, // duration in units of days, minutes, and seconds. e.g. 30d, 30m, 600s
        "<type>": string // duration in units of days, minutes, and seconds.
    }
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
        "audiences": { /** Same as Audience object on Message Schema */
            "kind": "users" | "everyone",
            "label": string, // label of users group if needed, This can be display in the message as well.
            "uids": string[], // List of `user_id` (only defined when "kind" == "users")
        },
    },
    "taxonomy": { // this is optional, setting this will scope down the category of the object will update the counting separately.
        "category": string, // application's defined key, e.g. use this to derive icon?
    },
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

## Technology Stack

- Monorepo with npm workspaces
- Lambda via SAM (Serverless Application Model)
- TypeScript with esbuild
- Development Simulation with LocalStack
- Persistent: DynamoDB (Single Table Design)

Please read [implementation](/implementation.md) for the details.

## Local Development Setup

### Prerequisites

The following tools are required for local development:

- **Docker & Docker Compose** - For running LocalStack
- **pipx** - For installing Python CLI tools
- **Node.js & npm** - For package management and builds
- **awslocal** - AWS CLI for LocalStack (installed via pipx)
- **samlocal** - SAM CLI for LocalStack (installed via pipx)

### Quick Start

1. **Check dependencies and install missing tools:**
   ```bash
   make check-deps          # Check if all tools are installed
   make install-deps        # Install awslocal and samlocal via pipx
   ```

2. **Set up development environment:**
   ```bash
   make dev                 # Full setup: install deps + start services
   ```

   Or run steps individually:
   ```bash
   make dev-setup          # Install npm packages and build shared module
   make dev-start          # Start LocalStack services
   ```

3. **Start development workflow:**
   ```bash
   make sam-sync           # Start sam sync for fast iteration
   ```

### Development Commands

| Command | Description |
|---------|-------------|
| `make help` | Show all available commands |
| `make check-deps` | Check if all required dependencies are installed |
| `make install-deps` | Install awslocal and samlocal via pipx |
| `make dev` | Full development setup (deps + services) |
| `make dev-start` | Start LocalStack services |
| `make dev-stop` | Stop LocalStack services |
| `make dev-logs` | Show LocalStack logs |
| `make sam-sync` | Start sam sync for fast development iteration |
| `make sam-build` | Build SAM application |
| `make sam-deploy-local` | Deploy to LocalStack |
| `make test` | Run tests |
| `make build` | Build all packages |
| `make status` | Check status of local services |
| `make clean` | Clean up build artifacts and containers |

### Development Workflow

1. Start LocalStack: `make dev-start`
2. In another terminal, start sam sync: `make sam-sync`
3. Make changes to your code
4. SAM will automatically rebuild and redeploy changes
5. Test your changes against LocalStack endpoints

### Architecture

The project uses a monorepo structure:

```
stak/
├── packages/
│   ├── stak/                # Lambda entry point and AWS infrastructure
│   │   ├── src/handlers/    # TypeScript Lambda handlers
│   │   ├── template.yaml    # SAM template
│   │   └── package.json     # Lambda service dependencies
│   └── shared/              # TypeScript ESM module for shared code
│       ├── src/             # Shared utilities and business logic
│       └── package.json     # Shared module dependencies
├── infra/local/             # LocalStack configuration
├── Makefile                 # Development automation
└── README.md
```

### LocalStack Services

The local environment runs:
- DynamoDB (port 4566)
- API Gateway (port 4566)
- CloudFormation (port 4566)
- IAM (port 4566)
- Lambda (port 4566)

All services are accessible via http://localhost:4566
