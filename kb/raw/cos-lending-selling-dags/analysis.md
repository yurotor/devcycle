# cos-lending-selling-dags

## Purpose
This repository contains Apache Airflow DAGs (Directed Acyclic Graphs) for orchestrating data workflows in a loan lending and selling system. It manages the end-to-end process of loan data ingestion, transformation, interest calculation, fee collection, and data exports for financial reporting.

## Business Features
- Loan data ingestion and synchronization from external sources
- Interest accrual calculations and processing
- Fee collection and management
- Loan curation and servicing
- Data export to external systems
- SOFR (Secured Overnight Financing Rate) ingestion
- Presale reporting generation
- Volume fee calculation and true-up processing
- MPL (Marketplace Lender) management
- Organizations and investor data management

## Dependencies
- **dbt** (shared-lib)
- **flyway** (shared-lib)
- **aws-ecs** (http)
- **postgres-rds** (database)
- **aws-athena** (http)
- **aws-ssm** (http)
- **aws-secrets-manager** (http)
- **aws-cloudwatch** (http)
- **volume-db** (database)
- **loans-db** (database)
- **contracts-db** (database)
- **vampire-db** (database)

## Data Entities
- **Loan** — Core loan data entity representing a financial loan with associated attributes
- **Account** — Financial account associated with loans
- **Organization** — Represents issuing banks and investors with organization IDs
- **Fee** — Various fees associated with loans and transactions
- **MPL** — Marketplace Lender entity with associated configuration
- **Batch** — Grouping of loans for processing or sale
- **SOFR** — Secured Overnight Financing Rate data used for interest calculations
- **LoanAction** — Record of actions performed on loans
- **Contract** — Legal agreements related to loans
- **Volume** — Volume data used for fee calculations and reporting

## External Integrations
- **VAMPIRE** — downstream via database
- **Athena** — bidirectional via REST
- **New Relic** — upstream via REST
- **Servicing System** — bidirectional via file

## Architecture Patterns
- Extract-Load-Transform (ELT)
- Task Orchestration
- Infrastructure as Code
- Event-driven Processing
- Parameterized Workflows

## Tech Stack
- Apache Airflow
- Python
- dbt
- Docker
- AWS ECS
- AWS MWAA
- PostgreSQL
- Flyway
- AWS Secrets Manager
- AWS SSM
- AWS CloudWatch
- AWS Athena

## Findings
### [HIGH] Hard-coded credentials in development environment

**Category:** security  
**Files:** .devcontainer/docker-compose.yml

The Docker Compose configuration contains hard-coded credentials for the Airflow database and MinIO S3 emulator. While these might be for local development only, they should be replaced with environment variables from a secure source to prevent accidental promotion to higher environments.
### [HIGH] Missing error handling in DAG dependencies

**Category:** architecture  
**Files:** dags/projects/loans_curation/loans_curation_dag.py, dags/projects/loans_ingestion/loans_ingestion_dag.py

The DAGs are chained together with simple operators without proper error handling or retry logic. This can lead to failed pipeline executions without clear visibility into the failure point. Implement robust error handling strategies with appropriate retry mechanisms and alerting.
