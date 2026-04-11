# cos-lending-selling-datatools

## Purpose
The cos-lending-selling-datatools repository is a data processing platform for the Cross River Bank lending and selling business, designed to extract, transform, and load data from source systems into data warehouses. It uses Airflow DAGs to orchestrate DBT transformations and data ingestion tasks from MSSQL databases, providing analytical capabilities for loan contracts, seasoning, and volume data.

## Business Features
- Loan data ingestion and transformation
- Contract data processing
- Loan seasoning calculations
- Volume fee calculation
- Loan sale status tracking
- Data export and warehousing

## APIs
- **POST /ecs-task-execution** — Executes DBT or ingestion tasks in ECS Fargate

## Dependencies
- **cos-lending-selling-web-api** (database)
- **aws-s3** (file)
- **aws-ssm** (http)
- **aws-ecs** (http)
- **aws-secrets-manager** (http)

## Data Entities
- **Loan** — Core loan data entity representing lending transactions
- **LoanType** — Categories of loans processed in the system
- **Contract** — Legal agreements governing loan terms and conditions
- **Fee** — Fee structures and calculations for loans
- **TermSheet** — Document outlining the terms of loan agreements
- **Seasoning** — Loan aging information used for HFS and LTHFS calculations
- **LoanSaleStatus** — Status of loan sale transactions

## Messaging Patterns
- **ECS Task Queue** (queue) — Manages execution of DBT and ingestion tasks in ECS Fargate

## External Integrations
- **AWS ECS Fargate** — bidirectional via REST
- **AWS S3** — bidirectional via REST
- **PostgreSQL Data Warehouse** — bidirectional via database
- **Airflow** — upstream via REST

## Architecture Patterns
- Data Pipeline
- ETL
- Containerized Microservices
- Task Orchestration
- Data Warehouse

## Tech Stack
- Python
- DBT
- Docker
- Airflow
- PostgreSQL
- AWS ECS
- AWS S3
- AWS SSM
- AWS Secrets Manager
- Boto3

## Findings
### [HIGH] Hardcoded S3 credentials

**Category:** security  
**Files:** dags/projects/utils/aws_utils.py

Local S3 credentials are hardcoded in aws_utils.py. Although these appear to be for local development only, hardcoded credentials pose a security risk if accidentally used in production contexts. Replace with environment variables or configuration files that are excluded from source control.
### [HIGH] Incomplete ingestion task implementation

**Category:** architecture  
**Files:** dags/projects/cos_lending_selling/bootstrapping_dag.py, dags/projects/utils/ingestion_task_factory.py

The bootstrapping_dag.py contains TODO comments indicating incomplete implementation of ingestion tasks. The ingestion task factory is referenced but the local implementation is not completed ('not_implemented' function in ingestion_task_factory.py), which would prevent proper execution in local development environments.
