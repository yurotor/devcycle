# cos-lending-selling-e2e-tests

## Purpose
This repository contains end-to-end tests for Cross River Bank's loan selling system, simulating the entire lending-selling environment to test loan origination, seasoning, interest calculation, fee collection, and loan purchase workflows in a controlled environment.

## Business Features
- Loan ingestion from source systems
- Loan curation and status management
- Interest calculation and accrual
- Volume fee calculation
- Loan purchase processing
- Fee collection and sweeping
- Loan type changes (grooming)
- Investor changes
- Servicing data ingestion
- True-up volume fee processing
- Pass-through interest calculations
- Auto-purchase functionality
- Merchant fee processing
- Purchase date adjustment

## APIs
- **POST /Accounting/v1/LoanAccounting/LoanActionsAccounts** — Get account information for loan actions
- **POST /Accounting/v1/LoanAccounting/ChangeLoanTypeAccounts** — Get accounts for loan type changes
- **GET /core/v1/dda/accounts/{account_number}** — Get account balance
- **GET /core/v1/dda/subaccounts/{account_number}** — Get subaccount balance
- **GET /init/{mpl_id}/{issuing_bank_id}/{loan_type}/{objective}/{account_number}/{is_subaccount}** — Initialize account configuration
- **POST /set_delay_transfers** — Control transfer delays in the COS mock service
- **POST /payment** — Process payment transfers

## Dependencies
- **selling-db** (database)
- **arix-db** (database)
- **web-api** (http)
- **dbt** (shared-lib)
- **cos-simulator** (http)
- **accounts-resolver** (http)
- **hooks** (messaging)
- **rabbitmq** (messaging)
- **aws-s3** (file)
- **aws-sqs** (messaging)

## Data Entities
- **Loan** — Core loan entity with funding details, status, and purchase information
- **Contract** — Defines relationship between MPL, bank, and investor with fee structures
- **LoanAction** — Represents actions performed on loans like purchase or interest accrual
- **Transfer** — Financial transfer between accounts for loan operations
- **Batch** — Group of loans processed together for purchase
- **AccountConfig** — Configuration for different account types used in loan transactions
- **TrueUpVolumeFee** — Volume fee adjustments based on contract terms

## Messaging Patterns
- **SQS Payment Processing** (queue) — Processes payment messages for transfers
- **Loan Sale Status Changed** (event) — Publishes events when loan sale status changes
- **Batch Purchase Completed** (event) — Publishes events when batch purchase is completed
- **True Up Volume Fee Charged** (event) — Publishes events when true-up volume fees are charged
- **Investor Changed** (event) — Publishes events when loan investor changes
- **Loan Type Changed** (event) — Publishes events when loan type changes
- **Transfer Outbox** (outbox) — Ensures reliable delivery of transfer messages

## External Integrations
- **COS (Core Operating System)** — downstream via REST
- **Arix** — upstream via database
- **LendingAccounting** — downstream via REST
- **AWS S3** — bidirectional via file
- **AWS SQS** — bidirectional via messaging
- **RabbitMQ** — bidirectional via messaging

## Architecture Patterns
- Microservices
- Event-driven architecture
- Outbox pattern
- Mock services
- Orchestration
- Time travel testing
- Message-based communication
- Transactional outbox
- Container-based testing

## Tech Stack
- Python
- Docker
- PostgreSQL
- MS SQL Server
- FastAPI
- SQLAlchemy
- RabbitMQ
- AWS SQS
- AWS S3
- pytest
- DBT (Data Build Tool)
- Docker Compose

## Findings
### [HIGH] Excessive use of sleep() for synchronization

**Category:** architecture  
**Files:** modules/e2e/src/assertions/batch_assertions.py, modules/e2e/src/assertions/grooming_assertions.py

The codebase uses numerous sleep() calls to wait for asynchronous operations to complete. This creates brittle tests that may fail intermittently or take longer than necessary to run. Replace with proper synchronization mechanisms like polling with timeouts or event listeners.
