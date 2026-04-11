# cos-lending-selling-dags

## Purpose
This repository contains Apache Airflow DAGs (Directed Acyclic Graphs) for automating and orchestrating data workflows in a lending and selling system. It schedules and manages various ETL processes, data synchronization tasks, fee calculations, and integration points between different services in the lending platform.

## Business Features
- Loan data ingestion and curation from external sources
- Interest accrual calculation and processing
- Fee collection and management
- Data export to third-party systems
- Presale reporting
- Servicing data synchronization
- MPL (Marketplace Lender) management
- SOFR (Secured Overnight Financing Rate) ingestion
- True-up volume fee processing
- Organization data management

## Dependencies
- **loans-db** (database)
- **volume-db** (database)
- **contracts-db** (database)
- **vampire-db** (database)
- **selling-db** (database)
- **dbt-runner** (shared-lib)
- **athena** (database)
- **lending-accounting-api** (http)

## Data Entities
- **Loan** — Core entity representing loan information including loan terms, status and related financial details
- **Account** — Entity that tracks financial accounts associated with loans
- **Fee** — Entity representing various fees applied to loans and accounts
- **MPL** — Marketplace Lender entity representing organizations that originate loans
- **Organization** — Entity representing issuing banks and investors
- **SOFR** — Secured Overnight Financing Rate data used for interest rate calculations
- **LoanAction** — Entity that tracks various actions performed on loans
- **Batch** — Entity that manages groups of loans processed together

## External Integrations
- **VAMPIRE** — downstream via database
- **AWS Athena** — bidirectional via database

## Architecture Patterns
- Extract-Load-Transform (ELT)
- Task orchestration
- Container-based task execution
- Parameter-driven workflows
- Database migration automation

## Tech Stack
- Apache Airflow
- Python
- AWS ECS
- AWS MWAA
- DBT (Data Build Tool)
- PostgreSQL
- Docker
- Flyway
- AWS Secrets Manager
- AWS SSM Parameter Store
- AWS CloudWatch

## Findings
### [HIGH] Hardcoded credentials in configuration

**Category:** security  
**Files:** .devcontainer/docker-compose.yml

The Docker configuration files contain hardcoded database credentials (postgres:airflow) which could pose a security risk if exposed. These should be replaced with environment variables or secrets management.
### [HIGH] Tight coupling to AWS infrastructure

**Category:** architecture  
**Files:** dags/projects/utils/dbt_task_factory.py, dags/projects/utils/ingestion_task_factory.py

The DAG implementations are tightly coupled to AWS services like ECS, SSM, and Secrets Manager, making it difficult to migrate to another cloud provider or run in a non-AWS environment. Consider abstracting cloud-specific implementations behind interfaces.
