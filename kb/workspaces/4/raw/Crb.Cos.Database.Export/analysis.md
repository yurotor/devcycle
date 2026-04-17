# Crb.Cos.Database.Export

## Purpose
A specialized .NET tool for exporting data from Cross River Bank's (CRB) databases to Parquet files for data integration

## Business Features
- Incremental Data Export
- Full Table Export
- Data Reconciliation
- Event Notification

## Dependencies
- **AWSSDK.DynamoDBv2** (shared-lib)
- **AWSSDK.S3** (shared-lib)
- **AWSSDK.SecretsManager** (shared-lib)
- **AWSSDK.SQS** (shared-lib)
- **Microsoft.Data.SqlClient** (shared-lib)
- **Npgsql** (shared-lib)
- **Polly** (shared-lib)
- **Parquet** (shared-lib)
- **System.IO.Abstractions** (shared-lib)
- **Microsoft.Extensions.DependencyInjection** (shared-lib)
- **Microsoft.Extensions.Options** (shared-lib)

## Data Entities
- **Checkpoint** — 
- **CosDatabaseTableSyncProgress** — 
- **ColumnDataType** — 

## Architecture Patterns
- Command pattern for executing different operations (Export, Reconcile)
- Strategy pattern for database reading (multiple query strategies)
- Factory pattern for database connections and operations
- Dependency injection for component wiring
- Repository pattern for persistence operations
- Resilience patterns using Polly for retry policies

## Tech Stack
