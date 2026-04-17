# Crb.Cos.Commons.Security

## Purpose
Crb.Cos.Commons.Security is a shared security library that provides common security utilities, helpers, and models for COS (Credit One Bank's Customer Onboarding System) services.

## Business Features
- User authentication and authorization
- Role-based permission management
- Multi-tenant security with partner-based access control
- Domain-specific permission configuration
- Security context management

## Dependencies
- **Crb.Cos.Commons.Caching** (shared-lib)
- **Crb.Cos.Commons.Secrets** (shared-lib)
- **Crb.Cos.Commons.Data** (shared-lib)
- **Crb.Cos.Commons.Ioc** (shared-lib)
- **Dapper** (shared-lib)
- **Autofac** (shared-lib)
- **Serilog** (shared-lib)
- **FluentNHibernate** (shared-lib)

## Data Entities
- **SecurityUser** — 
- **UserDbModel** — 
- **RoleConfig** — 

## External Integrations
- **SQL Security Database** — bidirectional via unknown
- **NHibernate** — bidirectional via unknown

## Architecture Patterns
- Repository Pattern
- Service Pattern
- Dependency Injection
- Provider Pattern
- Multi-tenancy

## Tech Stack
