# Crb.Cos.Commons.Database

## Purpose
A database access library that provides NHibernate-based ORM functionality with repository patterns for COS services

## Business Features
- Fluent configuration for NHibernate connections
- Repository pattern implementation with CRUD operations
- Support for AWS IAM authentication with Postgres
- Caching repository implementation
- Multi-database support with aliasing
- Connection string refreshing/credential rotation support
- Database platform abstractions (primarily PostgreSQL)
- Custom exception handling for database operations

## Dependencies
- **NHibernate** (shared-lib)
- **FluentNHibernate** (shared-lib)
- **AWS SDK** (shared-lib)
- **Autofac** (shared-lib)

## Data Entities
- **Payment** — 

## External Integrations
- **AWS RDS** — bidirectional via unknown
- **PostgreSQL** — bidirectional via unknown

## Architecture Patterns
- Repository Pattern
- Data Access Object (DAO) Pattern
- Fluent API Configuration
- Dependency Injection support

## Tech Stack
