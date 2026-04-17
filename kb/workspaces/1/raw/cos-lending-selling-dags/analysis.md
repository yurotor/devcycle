# cos-lending-selling-dags

## Purpose
This repository contains Airflow DAGs for orchestrating data processing workflows in a lending and selling system. It manages the ingestion, transformation, and curation of loan data, along with handling fee collections, interest accruals, and reporting for financial operations.

## Business Features
- Loan data ingestion and curation
- Interest accrual calculation
- Fee collection and processing
- Export data for reporting
- Servicing data management
- SOFR rate ingestion
- Volume fee true-up processing
- Presale reporting
- Account management and resolution

## Dependencies
- **PostgreSQL database** (database)
- **DBT** (shared-lib)
- **Flyway** (shared-lib)
- **AWS ECS** (http)
- **AWS Athena** (database)
- **AWS S3** (database)
- **AWS Secrets Manager** (shared-lib)
- **AWS SSM Parameter Store** (shared-lib)
- **External loan data API** (http)
- **External volume data API** (http)
- **External contract data API** (http)
- **External servicing data source** (database)
- **External SOFR data source** (http)
- **Vampire system** (bidirectional)

## Data Entities
- **Loan** — Core loan data entity representing loan contracts
- **Account** — Financial accounts associated with loans
- **Fee** — Fee structures and collection records
- **LoanAction** — Actions performed on loans
- **Batch** — Grouping of loans for processing
- **MPL** — Marketplace Lender entity
- **Organization** — Financial institutions like issuing banks & investors
- **Interest** — Interest accrual records

## External Integrations
- **SOFR data source** — upstream via REST
- **Vampire** — bidirectional via database
- **Loan data source** — upstream via REST
- **Contract data source** — upstream via REST
- **Volume data source** — upstream via REST
- **Servicing data source** — upstream via file

## Architecture Patterns
- Extract-Load-Transform (ELT)
- Container-based task execution
- Orchestration workflow
- Parameter-driven execution

## Tech Stack
- Apache Airflow
- Python
- Docker
- AWS ECS
- AWS MWAA
- PostgreSQL
- DBT
- Flyway
- AWS Athena
- AWS S3
- AWS Secrets Manager
- AWS SSM Parameter Store
- New Relic

## Findings
### [HIGH] Environment Variable Secrets in MWAA

**Category:** architecture  
**Files:** dags/projects/utils/ingestion_task_factory.py, dags/projects/utils/dbt_task_factory.py, dags/projects/utils/flyway_task_factory.py

The DAGs appear to rely on environment variables for configuration which may include sensitive values. MWAA environment variables are visible to all users with console access. Consider moving all sensitive configurations to AWS Secrets Manager.
### [HIGH] Hard-coded AWS region

**Category:** security  
**Files:** dags/projects/utils/flyway_task_factory.py, dags/projects/utils/dbt_task_factory.py, dags/projects/utils/ingestion_task_factory.py

AWS region is hard-coded as 'us-east-1' in log configuration which reduces portability and could create issues if deployed to a different region. Region should be retrieved from environment or configuration.
### [HIGH] Excessive IAM permissions for tasks

**Category:** architecture  
**Files:** dags/projects/utils/ingestion_task_factory.py, dags/projects/utils/dbt_task_factory.py

ECS tasks appear to use the same general role across different task types rather than least-privilege roles specific to each task's needs. Implement role separation based on task functionality requirements.
