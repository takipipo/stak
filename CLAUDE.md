# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stak is an open-source inbox service application designed to handle mobile app messaging use cases. It provides both user-facing APIs for message consumption and admin APIs for message broadcasting. The system uses DynamoDB single-table design for high-performance message storage and retrieval.

## Development Commands

### Package Management
- `npm install` - Install dependencies in the root
- `cd packages/stak-core-sv && npm install` - Install dependencies for the core service

### Serverless Deployment
- `cd packages/stak-core-sv && npx serverless deploy` - Deploy the service to AWS
- `cd packages/stak-core-sv && npx serverless deploy --stage dev` - Deploy to a specific stage
- `cd packages/stak-core-sv && npx serverless remove` - Remove the deployed service

### Local Development
- Use Serverless Offline for local development simulation
- Use LocalStack for local AWS service simulation (as mentioned in README)

## Architecture

### Monorepo Structure
```
stak/
├── packages/
│   └── stak-core-sv/        # Core serverless service
│       ├── index.js         # Express app with DynamoDB integration
│       ├── serverless.yml   # Serverless Framework configuration
│       └── package.json     # Service dependencies
├── README.md               # Comprehensive API documentation
└── package.json           # Root package configuration
```

### Core Service (stak-core-sv)
- **Framework**: Express.js wrapped with serverless-http
- **Database**: DynamoDB with single-table design
- **Runtime**: Node.js 18.x on AWS Lambda
- **Dependencies**: 
  - `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` for database operations
  - `express` for HTTP handling
  - `serverless-http` for Lambda integration

### Database Schema (DynamoDB Single Table)
- **Partition Key Pattern**: `t#<tenant_key>U#<user_id>#<inbox_key>`
- **Sort Key Patterns**:
  - `m#<message_id>` for messages
  - `c#*` for total unread count
  - `c#<category_id>` for category-specific unread count

### API Structure
The service provides two main API groups:
1. **Admin APIs** (`/stack/admin/v1/...`) - Server-to-server message broadcasting
2. **User APIs** (`/stack/users/v1/...`) - Client-facing message consumption

### Message Schema
Messages support multi-tenant architecture with:
- Tenant isolation via `tenant_key`
- Inbox separation via `inbox_key` (defaults to "DEFAULT")
- Custom message bodies with extensible JSON schema
- Audience targeting (specific users or everyone)
- Read receipt tracking

## Key Concepts

### Multi-tenancy
- All operations are scoped by `tenant_key`
- Messages are further organized by `inbox_key` within tenants

### Message Targeting
- **Users**: Target specific user IDs
- **Everyone**: Broadcast to all users in the tenant/inbox

### Performance Considerations
- Single-table design optimized for query patterns
- Partition keys designed to distribute load across user bases
- Message IDs are shared across recipients for storage efficiency