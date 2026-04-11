# iac-cos-lending-selling

## Purpose
This repository contains Infrastructure as Code (IaC) configurations for Cross River Bank's Cos Lending Selling platform. It automates the provisioning and management of AWS cloud resources including Aurora databases, Airflow workflows, API services, and storage solutions across multiple environments.

## Business Features
- Loan servicing and management
- Lending operations
- Loan selling automation
- AI/ML integration for lending decisions
- External database access management
- Workflow orchestration with Airflow

## APIs
- **REST /web-api/*** — Web application interface for lending services
- **REST /admin-api/*** — Administrative interface for lending system management
- **REST /ai-api/*** — AI-powered lending decision interface

## Dependencies
- **aurora-database** (database)
- **athena-analytics** (database)
- **s3-servicing** (shared-lib)
- **selling-x** (messaging)
- **airflow-mwaa** (http)

## Data Entities
- **LoanFunding** — Funding details for loan transactions
- **DatabaseCredentials** — Secure access credentials for database connections
- **ApplicationUser** — User identity and permissions for application access

## Messaging Patterns
- **SQS Queues** (queue) — Message queuing for selling-x service integration
- **CloudWatch Events** (event) — System monitoring and alerts for platform operations

## External Integrations
- **AI Decision Service** — bidirectional via REST
- **External Database** — bidirectional via database
- **Selling-X Platform** — bidirectional via messaging

## Architecture Patterns
- Infrastructure as Code
- Serverless Functions
- Containerized Services
- Secret Rotation
- Event-driven Architecture
- Microservices

## Tech Stack
- AWS
- Terraform
- Terragrunt
- ECS Fargate
- Aurora PostgreSQL
- Lambda
- S3
- SQS
- Airflow
- Python
- DynamoDB
- CloudWatch
- ALB
- Secrets Manager

## Findings
### [HIGH] Hardcoded SQL permissions in rotation scripts

**Category:** security  
**Files:** orchestration/terragrunt/aws/_env/ai-api/artifacts/app/rotate_secret.py, orchestration/terragrunt/aws/_env/db-external-access/artifacts/app/rotate_secret.py

The database credential rotation scripts (ai-api and db-external-access modules) contain hardcoded SQL permissions that are granted to users. These should be parameterized based on environment to prevent potential privilege escalation.
### [HIGH] State bucket name generation creates potential collision risk

**Category:** architecture  
**Files:** README.md

The terraform state bucket name is generated based on branch names, which could lead to collisions or unauthorized access. Consider using a more robust naming strategy with additional entropy and access controls.
