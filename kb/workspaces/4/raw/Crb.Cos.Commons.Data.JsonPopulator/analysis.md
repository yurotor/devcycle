# Crb.Cos.Commons.Data.JsonPopulator

## Purpose
This is a utility library for populating database tables with data from JSON files, supporting both Microsoft SQL Server and PostgreSQL databases.

## Business Features
- JSON-to-database row insertion with automatic parameter handling
- Support for clearing records from tables based on JSON data
- Type conversion handling for various database types
- Specialized handling for PostgreSQL-specific types (arrays, enums)

## APIs
- **GET ** — Inserts data from JSON into database tables
- **GET ** — Deletes all data from tables specified in the JSON
- **GET ** — Deletes specific records from tables matching the JSON data

## Dependencies
- **Microsoft.Data.SqlClient** (shared-lib)
- **Npgsql** (shared-lib)
- **System.Text.Json** (shared-lib)

## Data Entities
- **No specific data entities - this is a generic tool that works with any table schema** — 

## External Integrations
- **Microsoft SQL Server** — bidirectional via unknown
- **PostgreSQL** — bidirectional via unknown

## Tech Stack
