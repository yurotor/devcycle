# iac-cos-lending-selling

## Purpose
This repository contains Infrastructure as Code (IaC) for the Cross River Bank's lending and selling platform. It manages AWS cloud resources using Terragrunt and Terraform to provision and configure databases, APIs, messaging services, and orchestration components across multiple environments.

## Business Features
- Loan servicing and selling
- AI-based loan processing
- Database external access management
- Application infrastructure deployment
- Workflow orchestration with Airflow

## APIs
- **REST /admin-api** — Administrative API for internal operations
- **REST /web-api** — Web interface for loan management

## Dependencies
- **Aurora PostgreSQL** (database)
- **Amazon S3** (database)
- **Amazon ECS** (http)
- **Amazon SQS** (messaging)
- **Amazon Lambda** (http)
- **Amazon MWAA (Airflow)** (http)

## Data Entities
- **Loan** — Core lending entity with funding information
- **ExportedData** — Data exported from the system for external consumption

## Messaging Patterns
- **SQS Queues** (queue) — Message queues for selling platform operations

## External Integrations
- **AWS Secrets Manager** — bidirectional via REST
- **AWS CloudWatch** — upstream via REST
- **Artifactory** — upstream via REST

## Architecture Patterns
- Infrastructure as Code
- Microservices
- Secret Rotation
- CI/CD Pipeline
- Environment Segregation
- Serverless
- Container Orchestration

## Tech Stack
- Terragrunt
- Terraform
- AWS
- Python
- Docker
- PostgreSQL
- Apache Airflow
- Jenkins
- Azure DevOps

## Findings
### [HIGH] Hardcoded database permissions in rotation scripts

**Category:** security  
**Files:** orchestration/terragrunt/aws/_env/ai-api/artifacts/app/rotate_secret.py, orchestration/terragrunt/aws/_env/db-external-access/artifacts/app/rotate_secret.py

Database permissions are hardcoded in rotation scripts rather than being configurable, which could lead to privilege escalation or excessive permissions. Consider moving these to environment variables or configuration files.
### [HIGH] Secret rotation logic duplication

**Category:** architecture  
**Files:** orchestration/terragrunt/aws/_env/ai-api/artifacts/app/rotate_secret.py, orchestration/terragrunt/aws/_env/db-external-access/artifacts/app/rotate_secret.py

Secret rotation logic is duplicated across multiple Lambda functions with only slight differences. This creates maintenance issues and increases the risk of security vulnerabilities. Extract common code into a shared library.
