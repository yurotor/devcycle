# cos-lending-selling-ingestion

## Purpose
This repository handles data ingestion from various sources to a lending/selling database system. It primarily processes loan servicing data, SOFR rates, and contract information from different loan providers, and also collects metrics for monitoring the lending/selling platform's operational status.

## Business Features
- Loan servicing data ingestion from MPLs (Marketplace Lenders)
- SOFR (Secured Overnight Financing Rate) data ingestion from Federal Reserve API
- Contract data bootstrapping from external systems
- Synchronization of loan statuses between Arix and Selling databases
- CloudWatch metrics collection and reporting for operational dashboards
- Servicing data processing from S3 CSV files

## APIs
- **GET Federal Reserve SOFR API** — Fetch SOFR rates for loan calculations

## Dependencies
- **selling-db** (database)
- **loans-db** (database)
- **contracts-db** (database)
- **volume-db** (database)
- **vampire-db** (database)
- **AWS Secrets Manager** (shared-lib)
- **AWS CloudWatch** (shared-lib)
- **AWS S3** (shared-lib)
- **AWS Athena** (shared-lib)
- **AWS SSM Parameter Store** (shared-lib)

## Data Entities
- **Contract** — Loan contract terms and associated metadata
- **Loan** — Core loan entity with origination and sale status
- **MplBootstrapping** — Configuration for marketplace lender bootstrapping
- **Sofr** — SOFR rate data used for loan calculations
- **ServicingTimestamp** — Tracks data ingestion timestamps for each MPL
- **ServicingValue** — Loan servicing data values including interest and payment information

## Messaging Patterns
- **CloudWatch Metrics** (event) — Publishes operational metrics for loan processing and system health

## External Integrations
- **Federal Reserve** — upstream via REST
- **AWS S3** — upstream via file
- **Arix** — bidirectional via database
- **Vampire** — upstream via database
- **AWS CloudWatch** — downstream via messaging

## Architecture Patterns
- Extract-Transform-Load (ETL)
- Repository Pattern
- Database Abstraction Layer
- Configuration-Driven Processing
- Containerized Microservice

## Tech Stack
- Python
- SQLAlchemy
- PostgreSQL
- MS SQL Server
- AWS S3
- AWS CloudWatch
- AWS Secrets Manager
- AWS SSM Parameter Store
- AWS Athena
- Docker
- Pandas
- Boto3

## Findings
### [HIGH] Hardcoded Database Connection in README

**Category:** security  
**Files:** README.md

The README contains hardcoded database credentials (P4ssw0rd) for testing. Even if this is just for documentation, it sets a bad security precedent and could be mistaken for real credentials. Replace with placeholders or environment variable references.
### [HIGH] Insufficient Exception Handling in SOFR Ingestion

**Category:** architecture  
**Files:** modules/src/ingestion/sofr.py

The SOFR ingestion code doesn't properly handle API connectivity failures or response validation errors. Failed data fetches could cause inconsistent loan calculations. Implement comprehensive retry logic and fallback mechanisms.
### [HIGH] Unvalidated CSV File Processing

**Category:** security  
**Files:** modules/src/utils/s3_utils.py

S3Utils processes CSV files without proper validation, which could lead to injection attacks if maliciously crafted CSVs are uploaded. Implement strict schema validation before processing files.
