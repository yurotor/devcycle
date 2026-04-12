# iac-cos-lending-selling

## Purpose
This repository contains Infrastructure as Code (IaC) for the Cross River Bank Lending and Selling platform, provisioning and managing AWS cloud resources including Aurora databases, Airflow workflows, ECS Fargate tasks, S3 buckets, and other supporting services across multiple environments.

## Business Features
- Loan servicing infrastructure
- AI-based loan processing
- Data processing workflows via Airflow
- Loan selling functionality
- Database access management
- Monitoring and alerting

## Dependencies
- **admin-api** (http)
- **web-api** (http)
- **ai-api** (http)
- **Aurora PostgreSQL** (database)
- **SQS queues** (messaging)

## Data Entities
- **Loans** — Core loan data stored in Aurora database
- **LoanFunding** — Data related to loan funding process in dbt_temp schema

## Messaging Patterns
- **SQS queues for selling-x** (queue) — Message queues for loan selling processes

## External Integrations
- **External data consumers** — downstream via database
- **Amazon Athena** — bidirectional via file

## Architecture Patterns
- Infrastructure as Code
- Microservices
- Secret rotation pattern
- Lambda for database credential management
- Multi-environment deployment

## Tech Stack
- Terraform
- Terragrunt
- AWS (ECS, Aurora, Lambda, S3, SQS, MWAA, Athena)
- Python
- PostgreSQL
- Airflow
- Docker

## Findings
### [HIGH] Hard-coded certificate in repository

**Category:** security  
**Files:** docker/certs/crb.pem

A certificate file (crb.pem) is stored in the repository under docker/certs/. Certificates should never be stored in repositories and should instead be managed through secure certificate management solutions.
### [HIGH] Database credentials rotated but no integration tests

**Category:** architecture  
**Files:** orchestration/terragrunt/aws/_env/ai-api/artifacts/app/rotate_secret.py, orchestration/terragrunt/aws/_env/db-external-access/artifacts/app/rotate_secret.py

The Lambda rotation functions change database passwords but don't have comprehensive tests to verify application functionality continues after rotation. This could lead to service disruption if applications can't connect with new credentials.
