# cos-lending-selling-datatools

## Purpose
COS Lending Selling Datatools is a data pipeline repository that extracts, transforms, and loads data from the Cross River Bank lending and selling systems. It serves as the analytical data layer for the lending business, providing curated data models for reporting and analysis.

## Business Features
- Loan data extraction and transformation
- Contract and fee parameter data ingestion
- Seasoning period calculations
- Volume-based fee processing
- Data exports to warehouse

## APIs
- **GET /airflow/api** — Interface for Airflow DAG execution and monitoring

## Dependencies
- **selling-web-api** (database)
- **cos-lending-selling-database** (database)
- **aws-s3** (storage)
- **aws-ssm** (configuration)

## Data Entities
- **Loan** — Representation of a loan with origination and sale status
- **Contract** — Terms and conditions for loan agreements
- **Fee** — Fee parameters and calculations for loans
- **Seasoning** — Loan seasoning periods and rules
- **Volume** — Loan volume data used for fee calculations

## Messaging Patterns
- **LoanDataIngestion** (event) — Triggers extraction of loan data from source system
- **ContractIngestion** (event) — Triggers extraction of contract data from source system

## External Integrations
- **Cross River Bank Selling Web API** — upstream via database
- **AWS S3** — bidirectional via REST
- **AWS SSM** — upstream via REST

## Architecture Patterns
- ETL Pipeline
- Data Warehouse
- ECS Task Execution
- Container-based Processing

## Tech Stack
- Python 3.11
- dbt
- Airflow
- PostgreSQL
- Docker
- AWS ECS
- AWS S3
- AWS SSM
- AWS Fargate

## Findings
### [HIGH] Hardcoded S3 credentials in aws_utils.py

**Category:** security  
**Files:** dags/projects/utils/aws_utils.py

The file dags/projects/utils/aws_utils.py contains hardcoded S3 credentials (username and password) for local development. These should be moved to environment variables or a secure configuration to prevent credential exposure.
### [HIGH] Incomplete ingestion task implementation

**Category:** architecture  
**Files:** dags/projects/cos_lending_selling/bootstrapping_dag.py

The bootstrapping_dag.py contains TODO comments indicating incomplete implementation of ingestion tasks. The ingestion functionality is critical for the data pipeline but appears to be unfinished, which could cause data availability issues.
