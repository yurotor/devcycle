# cos-lending-selling-e2e-tests

## Purpose
This repository contains end-to-end testing framework for Cross River Bank's lending and selling platform, simulating the entire environment including loan origination, servicing, purchasing, and accounting operations to validate the platform's functionality through comprehensive test scenarios.

## Business Features
- Loan ingestion and curation
- Loan purchasing automation
- Contract management and enforcement
- Interest calculation and accrual
- Volume fee calculation and true-ups
- Loan servicing
- Loan type changes (grooming)
- Investor reassignment
- Fee collection and management
- Accounting integration
- Batch processing

## APIs
- **POST /Accounting/v1/LoanAccounting/LoanActionsAccounts** — Returns account configurations for loans
- **POST /Accounting/v1/LoanAccounting/ChangeLoanTypeAccounts** — Gets account configurations for loan type changes
- **GET /core/v1/dda/accounts/{account_number}** — Returns account balance information
- **GET /core/v1/dda/subaccounts/{account_number}** — Returns subaccount balance information
- **POST /payment** — Simulates payment processing

## Dependencies
- **selling-db** (database)
- **source-db** (database)
- **cos-sim** (http)
- **accounts-resolver** (http)
- **rabbitmq** (messaging)
- **hooks-e2e** (http)
- **web-api** (http)
- **AWS SQS** (messaging)
- **AWS S3** (file)

## Data Entities
- **Loan** — Core loan data with loan status, amounts, and investor information
- **Contract** — Terms and fee structures between MPL (marketplace lender) and bank
- **Batch** — Group of loans for purchase processing
- **LoanAction** — Operations performed on loans (purchase, interest accrual, etc.)
- **Transfer** — Money movement between accounts
- **AccountConfig** — Account configuration based on MPL, issuing bank, loan type, and objective
- **TrueUpVolumeFee** — Minimum fee true-up calculations for contracts
- **GroomingProcess** — Workflow for changing loan type with retroactive interest calculation

## Messaging Patterns
- **TransferOutbox** (outbox) — Ensures transfer messages are reliably sent to payment systems
- **DailyInterestOutbox** (outbox) — Ensures interest accrual messages are reliably processed
- **VolumeFeeOutbox** (outbox) — Ensures volume fee messages are reliably processed
- **SellingWebApiMessagesQueue** (queue) — Handles payment status updates from COS
- **LoanSaleStatusChanged** (event) — Publishes loan status change events to hooks service
- **BatchPurchaseCompleted** (event) — Publishes batch completion events to hooks service

## External Integrations
- **COS (Core Operating System)** — bidirectional via REST
- **Lending Accounting** — downstream via REST
- **Arix DB** — upstream via database
- **Hooks Service** — downstream via messaging
- **S3 Servicing** — upstream via file

## Architecture Patterns
- Microservices
- Event-driven
- Outbox Pattern
- Database-per-service
- API Gateway
- Message Queue
- Docker Containerization

## Tech Stack
- Python
- FastAPI
- PostgreSQL
- MSSQL
- Docker
- RabbitMQ
- AWS SQS
- AWS S3
- DBT
- Pytest
- Pydantic
- SQLAlchemy

## Findings
### [HIGH] Insufficient error handling in payment processing

**Category:** architecture  
**Files:** modules/cos/src/main.py, modules/e2e/src/assertions/batch_assertions.py

The payment simulation in modules/cos/src/main.py lacks proper error handling for failed transactions, which could lead to inconsistent state. Implement robust error handling and retries for payment failures.
### [HIGH] AWS credentials passed as environment variables

**Category:** security  
**Files:** docker-compose.yml, scripts/prepare.sh

AWS credentials are passed as environment variables in docker-compose.yml which is a security risk. Use AWS IAM roles or a secure credentials manager instead of hardcoded credentials.
### [HIGH] Tight coupling to simulated services

**Category:** architecture  
**Files:** modules/e2e/src/accounting.py, modules/e2e/src/airflow.py, modules/e2e/src/dbt.py

The test framework is tightly coupled to specific implementations of simulated services, making it brittle when service interfaces change. Consider using interface-based testing or contract testing approaches.
