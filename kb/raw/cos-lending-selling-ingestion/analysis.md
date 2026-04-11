# cos-lending-selling-ingestion

## Purpose
This repository manages data ingestion for CrossRiver Bank's lending and selling operations. It ingests loan data from various Marketplace Lending (MPL) partners, SOFR rates, and servicing data into a central database, while also providing metrics and reporting capabilities for monitoring loan statuses and financial transactions.

## Business Features
- Loan data ingestion from marketplace lending partners
- Secured Overnight Financing Rate (SOFR) ingestion from Federal Reserve API
- Servicing data ingestion from CSV files stored in S3
- Loan status synchronization between Arix and Selling databases
- Financial metrics collection and reporting to CloudWatch
- Contract data management and bootstrapping

## APIs
- **GET Federal Reserve API** — Fetch SOFR (Secured Overnight Financing Rate) data

## Dependencies
- **selling-database** (database)
- **loans-database** (database)
- **contracts-database** (database)
- **volume-database** (database)
- **vampire-database** (database)
- **S3** (database)
- **Athena** (database)
- **cos-lending-selling** (http)

## Data Entities
- **Contract** — Represents loan contract terms including MPL ID, effective/expiration dates, and seasoning info
- **Loan** — Core loan data with loan ID, loan number, MPL ID and statuses
- **MplBootstrapping** — Configuration for enabled marketplace lending partners
- **Sofr** — Secured Overnight Financing Rate data with values, types and timestamps
- **ServicingTimestamp** — Tracking last ingestion timestamp for each MPL's servicing data
- **ServicingValue** — Servicing data values for loans including amounts and interest

## Messaging Patterns
- **CloudWatch metrics** (event) — Collects and reports metrics about loan transactions and statuses to CloudWatch

## External Integrations
- **Federal Reserve API** — upstream via REST
- **AWS S3** — upstream via file
- **AWS Athena** — upstream via file
- **AWS CloudWatch** — downstream via messaging

## Architecture Patterns
- Repository pattern
- ETL (Extract, Transform, Load)
- Metrics reporting
- Data synchronization

## Tech Stack
- Python
- SQLAlchemy
- Pandas
- AWS (S3, CloudWatch, Athena)
- PostgreSQL
- Microsoft SQL Server
- Docker

## Findings
### [HIGH] Hardcoded credentials in README

**Category:** security  
**Files:** README.md

The README.md file contains hardcoded database credentials (MSSQL_SA_PASSWORD=P4ssw0rd) which should be removed and replaced with environment variables or secure credential management.
### [HIGH] TrustServerCertificate set to yes

**Category:** security  
**Files:** modules/src/utils/db_utils.py

Database connection is configured to trust server certificates without verification in db_utils.py, potentially allowing man-in-the-middle attacks. This should be removed in production environments and proper certificate validation implemented.
