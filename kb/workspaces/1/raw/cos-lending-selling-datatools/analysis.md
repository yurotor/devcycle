# cos-lending-selling-datatools

## Purpose
cos-lending-selling-datatools is a data engineering repository for the Cross River Bank lending and selling platform. It provides tools for data extraction, transformation, and loading (ETL) using dbt, Airflow, and Python to facilitate analytics and reporting for the loan selling business.

## Business Features
- Loan data extraction and transformation
- Contract and termsheet processing
- Volume and seasoning analysis
- Data export capabilities
- Entity and reference data management

## APIs
- **POST /api/ingestion** — Ingests various types of data from source systems (loans, contracts, volume data)

## Dependencies
- **cos-lending-selling-web-api** (database)
- **aws-s3** (storage)
- **aws-secrets-manager** (security)
- **aws-ssm** (configuration)
- **aws-ecs** (compute)
- **postgres-warehouse** (database)

## Data Entities
- **Loan** — Core loan data including type, status, and sale information
- **Contract** — Agreement terms between CRB and partner institutions
- **Fee** — Fee structures and parameters for loans
- **Termsheet** — Effective termsheet configurations and parameters
- **Interest** — Interest rate information for loans
- **Seasoning** — Loan aging and seasoning period information
- **Tiering** — Tier ranges and parameters for loan pricing

## Messaging Patterns
- **Data Ingestion Events** (event) — Events triggered upon completion of data ingestion operations

## External Integrations
- **COS Lending Selling Web API** — upstream via database
- **AWS S3** — bidirectional via REST
- **AWS ECS** — downstream via REST
- **AWS Secrets Manager** — upstream via REST

## Architecture Patterns
- Data warehouse
- ETL pipeline
- Container-based deployment
- Infrastructure as code
- Data lake

## Tech Stack
- Python 3.11
- dbt
- Airflow
- Docker
- PostgreSQL
- AWS S3
- AWS ECS
- AWS SSM
- AWS Secrets Manager
- Jupyter

## Findings
### [HIGH] Hardcoded credentials in aws_utils.py

**Category:** security  
**Files:** dags/projects/utils/aws_utils.py

The file dags/projects/utils/aws_utils.py contains hardcoded S3 credentials (username: 'admin', password: 'p4ssw0rd'). While these appear to be for local development only, hardcoded credentials represent a security risk if accidentally used in other environments or committed to version control.
### [HIGH] Incomplete ingestion task implementation

**Category:** architecture  
**Files:** dags/projects/utils/ingestion_task_factory.py

The ingestion task factory in dags/projects/utils/ingestion_task_factory.py has incomplete local implementation with a placeholder method 'not_implemented()'. This could cause runtime failures when executing DAGs in local environment and suggests incomplete migration from test/development code to production-ready components.
