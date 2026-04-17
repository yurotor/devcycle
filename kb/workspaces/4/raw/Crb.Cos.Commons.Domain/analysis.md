# Crb.Cos.Commons.Domain

## Purpose
Crb.Cos.Commons.Domain is a .NET Core library providing shared domain concerns and custom data types for NHibernate ORM integration across multiple database platforms (SQL Server and PostgreSQL).

## Business Features
- Enum to database lookup management for persisting enum values with descriptions
- Custom data types for NHibernate ORM mappings
- JSON serialization/deserialization for database columns
- Partitioned entity base class for database partitioning
- PostgreSQL specific data type mappings (arrays, JSONB)

## Dependencies
- **NHibernate** (shared-lib)
- **Newtonsoft.Json** (shared-lib)
- **Dapper** (shared-lib)
- **Npgsql** (shared-lib)
- **Autofac** (shared-lib)
- **Crb.Cos.Commons.Data** (shared-lib)
- **Crb.Cos.Commons.Extensions** (shared-lib)
- **Crb.Cos.Commons.Reflection** (shared-lib)
- **Crb.Cos.Commons.Secrets** (shared-lib)
- **Crb.Cos.Commons.Dates** (shared-lib)
- **Crb.Cos.Commons.Guids** (shared-lib)

## Tech Stack
