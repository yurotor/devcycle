# iac-cos-lending-selling

## Purpose
This repository contains the Infrastructure as Code (IaC) for Cross River Bank's Lending and Selling platform. It uses Terragrunt to provision and manage AWS cloud resources including databases, APIs, compute resources, and storage services required for loan servicing and selling operations.

## Business Features
- Loan servicing
- Loan selling
- AI-powered lending analytics
- Database access management
- Workflow orchestration

## APIs
- **Multiple /admin-api** — Administrative interface for lending platform management
- **Multiple /web-api** — Customer-facing API for lending services
- **Multiple /ai-api** — AI-powered lending decision and analytics API

## Dependencies
- **Aurora PostgreSQL** (database)
- **Amazon S3** (shared-lib)
- **Amazon ECS** (http)
- **AWS Lambda** (http)
- **Amazon SQS** (messaging)
- **Amazon Secrets Manager** (database)
- **Amazon MWAA (Airflow)** (http)

## Data Entities
- **LoanFunding** — Represents loan funding data in the lending platform
- **DatabaseCredential** — Represents database access credentials for various services

## Messaging Patterns
- **SQS Queues for Selling-X** (queue) — Message queues for loan selling processes
- **Secret Rotation** (event) — Event-driven credential rotation for database access

## External Integrations
- **External Database Systems** — bidirectional via database
- **AWS Secrets Manager** — bidirectional via REST
- **AI Service** — bidirectional via REST

## Architecture Patterns
- Infrastructure as Code
- Serverless
- Microservices
- Event-driven
- Container-based deployment
- Workflow orchestration

## Tech Stack
- Terragrunt
- Terraform
- AWS
- Docker
- Python
- PostgreSQL
- Airflow
- Lambda
- ECS
- S3
- SQS
- DynamoDB
- CloudWatch

## Findings
### [HIGH] Hardcoded root database access in Lambda functions

**Category:** security  
**Files:** orchestration/terragrunt/aws/_env/ai-api/artifacts/app/rotate_secret.py, orchestration/terragrunt/aws/_env/db-external-access/artifacts/app/rotate_secret.py

The secret rotation Lambda functions reference a root secret ARN for database access, creating a potential security risk if compromised. Consider using a more restricted service account or IAM role-based authentication.
### [HIGH] Direct SQL query construction using f-strings

**Category:** security  
**Files:** orchestration/terragrunt/aws/_env/ai-api/artifacts/app/rotate_secret.py, orchestration/terragrunt/aws/_env/db-external-access/artifacts/app/rotate_secret.py

Direct SQL query construction using f-strings in Lambda functions could lead to SQL injection vulnerabilities. While most SQL is properly parameterized, the grant permission statements use f-strings. Switch to parameterized queries for all SQL operations.
