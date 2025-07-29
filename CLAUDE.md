# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Stak is an open-source inbox service application designed to handle mobile app messaging use cases. It provides both user-facing APIs for message consumption and admin APIs for message broadcasting. The system uses DynamoDB single-table design for high-performance message storage and retrieval.

## Development Commands

### Quick Setup
- `make dev` - Full development setup (install deps + start LocalStack)
- `make check-deps` - Verify all required tools are installed
- `make install-deps` - Install awslocal and samlocal via pipx

### Local Development & Testing
- `make dev-start` - Start LocalStack services
- `make sam-sync` - Start sam sync for fast development iteration (recommended)
- `make sam-build` - Build SAM application
- `make sam-deploy-local` - Deploy to LocalStack
- `make test` - Run Jest unit tests for Lambda service
- `npm run build -w packages/shared` - Build shared module
- `npm run type-check -w packages/shared` - Type check shared module

### Package Management
- `npm install` - Install dependencies for all packages
- `npm install -w packages/stak` - Install dependencies for the Lambda service
- `npm install -w packages/shared` - Install dependencies for shared utilities

### LocalStack Development
- `make dev-stop` - Stop LocalStack services
- `make dev-logs` - Show LocalStack logs
- `make status` - Check status of local services
- `make clean` - Clean up build artifacts and containers

### AWS Deployment
- `cd packages/stak && sam deploy` - Deploy Lambda functions to AWS
- `cd packages/stak && sam deploy --guided` - Interactive deployment configuration

## Architecture

### Monorepo Structure
```
stak/
├── packages/
│   ├── stak/                # Lambda entry point and AWS infrastructure
│   │   ├── src/handlers/    # TypeScript Lambda handlers
│   │   ├── template.yaml    # SAM template
│   │   ├── buildspec.yml    # Build configuration
│   │   └── package.json     # Lambda service dependencies
│   └── shared/              # TypeScript ESM module for shared code
│       ├── src/             # Shared utilities and business logic
│       └── package.json     # Shared module dependencies
├── README.md               # Comprehensive API documentation
└── package.json           # Root monorepo configuration
```

### Lambda Service (packages/stak)
- **Framework**: SAM (Serverless Application Model)
- **Database**: DynamoDB with single-table design
- **Runtime**: Node.js 18.x on AWS Lambda
- **Build Tool**: esbuild for TypeScript compilation
- **Dependencies**: 
  - `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` for database operations
  - Local `packages/shared` module for business logic

### Shared Module (packages/shared)
- **Purpose**: TypeScript ESM module for shared code and utilities
- **Export Format**: ES Modules
- **Contains**: Database layer, business logic, types, and utilities

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