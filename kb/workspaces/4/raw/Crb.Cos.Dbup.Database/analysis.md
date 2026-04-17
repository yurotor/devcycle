# Crb.Cos.Dbup.Database

## Purpose
This repository provides a database migration tool built on DbUp for managing SQL scripts execution in both PostgreSQL and SQL Server databases. It supports running one-time and every-time scripts in a structured and organized way.

## Business Features
- Database Migration Execution
- Script Type Management
- Dry Run Capability
- Multi-database Support

## Dependencies
- **DbUp** (shared-lib)
- **FluentCommandLineParser** (shared-lib)
- **Microsoft.Extensions.Hosting** (shared-lib)
- **Microsoft.Extensions.Options** (shared-lib)
- **Serilog** (shared-lib)

## Data Entities
- **dbupscripts** — Journal table that tracks executed scripts to avoid re-running one-time scripts

## External Integrations
- **DbUp** — bidirectional via unknown
- **PostgreSQL** — bidirectional via unknown
- **SQL Server** — bidirectional via unknown

## Tech Stack

## Findings
### [LOW] PostgreSQL Default Schema

**Category:** architecture  
**Files:** N/A

The code defaults to using the 'public' schema for PostgreSQL databases, which might need to be adjusted for environments with custom schemas.
