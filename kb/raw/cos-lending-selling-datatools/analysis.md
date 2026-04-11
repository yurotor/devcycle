# cos-lending-selling-datatools

## Purpose
This repository contains data transformation tools for CrossRiver Bank's lending and selling operations. It uses DBT (Data Build Tool) to transform data from source systems into a data warehouse, with Apache Airflow orchestrating the ETL pipelines in both local development and cloud (AWS) environments.

## Business Features
- Loan data processing and transformation
- Contract data ingestion and management
- Seasoning period tracking and calculations
- Volume fee calculations and reporting
- Reference data management for loan types, statuses, and entities

## APIs
- **POST /api/ingestion** — Ingests data from source systems into the data warehouse

## Dependencies
- **cos-lending-selling-web-api** (database)
- **aws-ssm** (http)
- **aws-s3** (http)
- **aws-secretsmanager** (http)
- **aws-ecs** (http)

## Data Entities
- **Loan** — Core entity representing loans being processed in the system
- **Contract** — Represents loan contracts with associated terms and conditions
- **Account** — Entity representing customer accounts
- **LoanTypeEntity** — Reference data for loan types
- **LoanSaleStatusEntity** — Reference data for loan sale statuses
- **SeasoningPeriodEntity** — Reference data for loan seasoning periods
- **Fee** — Fee structures and parameters applied to loans
- **VolumeFee** — Volume-based fee calculations for loan portfolios

## Messaging Patterns
- **ECSTaskExecution** (event) — Orchestrates ETL tasks execution via AWS ECS Fargate

## External Integrations
- **AWS S3** — bidirectional via REST
- **AWS SSM Parameter Store** — upstream via REST
- **AWS ECS** — upstream via REST
- **PostgreSQL** — bidirectional via database
- **AWS Secrets Manager** — upstream via REST

## Architecture Patterns
- ETL Pipeline
- Data Warehouse
- Containerization
- Infrastructure as Code
- DevOps Automation

## Tech Stack
- Python
- DBT (Data Build Tool)
- Apache Airflow
- Docker
- PostgreSQL
- AWS ECS
- AWS S3
- AWS SSM Parameter Store
- AWS Secrets Manager
- Flyway
- Jenkins
- Azure DevOps

## Findings
### [HIGH] Hardcoded credentials in aws_utils.py

**Category:** security  
**Files:** dags/projects/utils/aws_utils.py

The file dags/projects/utils/aws_utils.py contains hardcoded S3 credentials (username and password) for local development. While these appear to be for local development only, hardcoded credentials are a security risk and should be moved to environment variables or a dedicated configuration file that is not tracked in source control.
### [HIGH] Incomplete bootstrapping DAG implementation

**Category:** architecture  
**Files:** dags/projects/cos_lending_selling/bootstrapping_dag.py

The bootstrapping DAG file (dags/projects/cos_lending_selling/bootstrapping_dag.py) contains TODO comments indicating unfinished implementation. This could cause problems when deploying to production as the ETL pipeline may not function correctly or may be missing critical components.
### [HIGH] Duplicate source definitions across DBT projects

**Category:** optimization  
**Files:** modules/dbt/projects/export/models/source/loan_type_entity.yml, modules/dbt/projects/loans_curation/models/source/loan_type_entity.yml, modules/dbt/projects/seasoning/models/source/loan_type_entity.yml

Multiple DBT projects (export, loans_curation, seasoning) define the same source tables independently. This creates maintenance overhead and risk of inconsistency when source schemas change. Consider centralizing source definitions in a shared package.
