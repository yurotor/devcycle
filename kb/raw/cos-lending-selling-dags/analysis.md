# cos-lending-selling-dags

## Purpose
This repository contains Apache Airflow DAGs (Directed Acyclic Graphs) that orchestrate various ETL processes for a loan selling and servicing platform. It automates data ingestion, transformation, and synchronization between systems to enable loan management, fee collection, interest accrual, and reporting.

## Business Features
- Loan data ingestion and curation from source systems
- Interest accrual calculations for loans
- Fee collection and processing
- Data export for reporting and analytics
- Loan servicing data management
- MPL (Marketplace Lender) management
- SOFR rate ingestion for interest calculations
- Pre-sale reporting for loan sales
- Synchronization with vampire (sales data system)
- Account resolution and management

## Dependencies
- **dbt-transformations** (shared-lib)
- **flyway-migrations** (shared-lib)
- **ingestion-modules** (shared-lib)
- **postgres-rds** (database)
- **vampire** (database)
- **athena** (database)

## Data Entities
- **Loan** — Core loan data representing originated loans in the system
- **Account** — Financial accounts associated with loans
- **Fee** — Fee data for loan processing and servicing
- **MPL** — Marketplace Lender entities that originate loans
- **Organization** — Issuing banks and investors that participate in the lending ecosystem
- **SOFR** — Secured Overnight Financing Rate data used for interest calculations
- **Contract** — Legal contracts associated with loans
- **FeeTierRange** — Tier-based fee structure definitions

## External Integrations
- **SOFR data source** — upstream via REST
- **Vampire** — downstream via database
- **Athena** — upstream via database
- **Servicing data source** — upstream via file

## Architecture Patterns
- ELT (Extract, Load, Transform)
- Task orchestration
- Container-based processing
- Infrastructure as Code
- Data pipeline

## Tech Stack
- Apache Airflow
- Python
- AWS ECS
- Docker
- PostgreSQL
- DBT (Data Build Tool)
- Flyway
- AWS Secrets Manager
- AWS SSM Parameter Store
- AWS Athena
- AWS CloudWatch

## Findings
### [HIGH] Secret Management Inconsistency

**Category:** security  
**Files:** .devcontainer/docker-compose.yml, dags/projects/utils/ingestion_task_factory.py

The repository uses a mix of AWS Secrets Manager and environment variables for credential management. Some credentials like database passwords are properly managed through Secrets Manager ARNs, while others may be exposed through environment files (e.g., selling.env). All secrets should be managed consistently through Secrets Manager to prevent potential credential exposure.
### [HIGH] Missing Error Handling in Dag Tasks

**Category:** architecture  
**Files:** dags/projects/loans_ingestion/loans_ingestion_dag.py, dags/projects/utils/dbt_task_factory.py, dags/projects/utils/ingestion_task_factory.py

Many of the DAG tasks have minimal or no error handling, which can lead to silent failures or incomplete executions without clear diagnostics. Tasks should implement proper exception handling with appropriate logging and recovery mechanisms to ensure reliability.
