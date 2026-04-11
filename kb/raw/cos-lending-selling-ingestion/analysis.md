# cos-lending-selling-ingestion

## Purpose
This repository provides data ingestion services for the Cross River Bank lending and selling platform. It handles ETL processes for loan data, contracts, and financial rates (SOFR) from various sources into a centralized database for reporting and operational use.

## Business Features
- Loan data ingestion from MPL (Marketplace Lending) partners
- Contract data bootstrapping from contract management system
- SOFR (Secured Overnight Financing Rate) rates ingestion from Federal Reserve API
- Servicing data ingestion from S3 CSV files
- Loan status synchronization between Arix and Selling databases
- CloudWatch metrics reporting for operational monitoring

## APIs
- **GET Federal Reserve API** — Fetches SOFR rates for financial calculations

## Dependencies
- **selling-db** (database)
- **loans-db** (database)
- **contracts-db** (database)
- **volume-db** (database)
- **vampire-db** (database)
- **aws-s3** (file)
- **aws-athena** (database)
- **aws-cloudwatch** (messaging)
- **aws-secrets-manager** (shared-lib)
- **aws-ssm** (shared-lib)

## Data Entities
- **Contract** — Represents loan contracts between Cross River and MPL partners with effective dates and terms
- **Loan** — Core loan entity containing loan identifiers, status, and origination information
- **MplBootstrapping** — Configuration for enabled MPL (Marketplace Lending) partners
- **Sofr** — Secured Overnight Financing Rate data from Federal Reserve
- **ServicingTimestamp** — Records of when servicing data was ingested by MPL
- **ServicingValue** — Loan servicing data with payment and interest information

## Messaging Patterns
- **CloudWatch Metrics** (event) — Publishes operational metrics to CloudWatch for monitoring loan volumes, transfers, and processing status

## External Integrations
- **Federal Reserve API** — upstream via REST
- **AWS S3** — upstream via file
- **AWS Athena** — bidirectional via SQL
- **AWS CloudWatch** — downstream via messaging
- **Arix Database** — upstream via SQL

## Architecture Patterns
- ETL (Extract, Transform, Load)
- Microservice
- Event-driven metrics
- Data synchronization
- Container-based deployment

## Tech Stack
- Python
- SQLAlchemy
- Pandas
- Docker
- PostgreSQL
- MS SQL Server
- AWS S3
- AWS CloudWatch
- AWS Secrets Manager
- AWS SSM
- AWS Athena
- Pydantic
- PyTest

## Findings
### [HIGH] Hardcoded credentials in Docker examples

**Category:** security  
**Files:** README.md

README.md contains hardcoded sample credentials (P4ssw0rd) for MS SQL Server. While these appear to be for local testing purposes, hardcoded credentials should never appear in repositories as they can be accidentally used in production or create poor security practices.
### [HIGH] Lack of error handling in SOFR data ingestion

**Category:** architecture  
**Files:** modules/src/ingestion/sofr.py

When SOFR data ingestion fails, there is minimal retry logic and error recovery. Given this is a critical financial rate for loan calculations, the system should have more robust error handling and alerting when rate ingestion fails.
### [HIGH] TrustServerCertificate set to 'yes' in database connections

**Category:** security  
**Files:** modules/src/utils/db_utils.py

SQL Server connections have 'TrustServerCertificate' set to 'yes' which bypasses certificate validation. This creates a vulnerability to man-in-the-middle attacks and should be fixed by properly configuring trusted certificates.
