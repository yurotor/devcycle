# cos-lending-selling-e2e-tests

## Purpose
This repository contains end-to-end testing infrastructure for Cross River Bank's lending and selling platform, simulating the entire selling environment with mock services and automated tests to validate loan origination, processing, interest accrual, and purchasing workflows.

## Business Features
- Loan origination and purchase flow testing
- Interest and fee calculation validation
- Contract management and volume fee processing
- Loan seasoning and curation processes
- Servicing data ingestion and validation
- True-up volume fee calculation
- Pass-through interest processing
- Loan type grooming and change approval workflows
- Investor change management
- Batch purchase automation

## APIs
- **POST /Accounting/v1/LoanAccounting/LoanActionsAccounts** — Get accounts for loan actions based on MPL, bank and loan type
- **POST /Accounting/v1/LoanAccounting/ChangeLoanTypeAccounts** — Get accounts for changing loan type
- **GET /core/v1/dda/accounts/{account_number}** — Get account balance
- **GET /core/v1/dda/subaccounts/{account_number}** — Get subaccount balance
- **POST /payment** — Process payment transactions
- **GET /init/{mpl_id}/{issuing_bank_id}/{loan_type}/{objective}/{account_number}/{is_subaccount}** — Initialize account configuration
- **POST /set_delay_transfers** — Enable or disable transfer delays in the COS mock service

## Dependencies
- **selling-web-api** (http)
- **selling-hooks-service** (messaging)
- **dbt-e2e** (shared-lib)
- **accounts-resolver** (http)
- **arix-db** (database)
- **selling-db** (database)
- **cos-simulator** (http)
- **rabbitmq** (messaging)
- **aws-sqs** (messaging)
- **aws-s3** (shared-lib)

## Data Entities
- **Loan** — Core loan entity with sale status, origination data, and financial details
- **Contract** — Configuration for interest calculation, timing, and fee structures
- **AccountConfig** — Bank account configuration for different transaction types
- **Batch** — Group of loans processed together for purchase
- **LoanAction** — Actions performed on loans like purchase, interest accrual
- **Transfer** — Financial transaction between accounts
- **FeeSweep** — Configuration for periodic fee collection
- **TrueUpVolumeFee** — Monthly minimum fee adjustment calculations

## Messaging Patterns
- **SQS Payment Queue** (queue) — Queue for processing payment completion events
- **LoanSaleStatusChanged** (event) — Event published when loan sale status changes
- **BatchCompleted** (event) — Event published when batch purchase completes
- **TrueUpCharged** (event) — Event published when true-up volume fee is charged
- **InvestorChanged** (event) — Event published when loan investor changes
- **LoanTypeChanged** (event) — Event published when loan type is changed
- **TransferOutbox** (outbox) — Outbox pattern for transfer events
- **DailyInterestOutbox** (outbox) — Outbox pattern for interest accrual

## External Integrations
- **COS (Core Operating System)** — bidirectional via REST
- **Arix DB** — upstream via database
- **Lending Accounting** — downstream via REST
- **AWS S3** — bidirectional via file
- **Hooks Service** — downstream via messaging

## Architecture Patterns
- Microservices
- Event-driven architecture
- Outbox pattern
- Mock services
- Container orchestration
- Time travel simulation

## Tech Stack
- Python
- FastAPI
- Docker
- PostgreSQL
- MS SQL Server
- DBT
- RabbitMQ
- AWS SQS
- AWS S3
- Pytest

## Findings
### [HIGH] Hard-coded secrets and credentials

**Category:** architecture  
**Files:** scripts/run.sh, modules/cos/src/sqs.py, modules/e2e/src/loader.py

Several files contain hard-coded credentials or references to injecting AWS credentials directly in scripts. This is a security risk. Implement a secure secret management solution or use environment variables consistently.
### [HIGH] Insufficient error handling in payment processing

**Category:** security  
**Files:** modules/cos/src/main.py, modules/cos/src/sqs.py

The COS simulator does not properly handle transaction failures and always returns success responses. This could mask real payment processing issues in tests. Add error simulation capabilities and verify error handling paths.
