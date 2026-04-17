# Crb.Cos.Commons.Api

## Purpose


## Business Features
- User permission-based authorization
- Idempotency handling for API requests
- Request/response logging
- Health check endpoints
- Request tracing and correlation

## Dependencies
- **Crb.Cos.Commons** (shared-lib)
- **Crb.Cos.Commons.Contracts** (shared-lib)
- **Crb.Cos.Commons.Logging** (shared-lib)
- **Crb.Cos.Commons.Security** (shared-lib)
- **Asp.Versioning** (shared-lib)
- **Swashbuckle** (shared-lib)
- **Dapper** (shared-lib)
- **Serilog** (shared-lib)
- **Autofac** (shared-lib)

## Data Entities
- **IdempotentKey** — 
- **IdempotentContent** — 
- **ApiLogEntry** — 

## Architecture Patterns
- Middleware Pipeline
- Attribute-based Authorization
- Health Check Pattern
- Policy-based Authorization
- Repository Pattern
- Filters

## Tech Stack
