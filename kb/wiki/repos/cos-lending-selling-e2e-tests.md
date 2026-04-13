# cos-lending-selling-e2e-tests

## Purpose

This repository contains end-to-end testing infrastructure for Cross River Bank's lending and selling services, simulating the entire lending environment to validate loan processing from origination through purchase, including interest calculations, fee processing, and account transfers.

## Communicates With

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [Arix Database](../repos/arix-database.md), [AWS S3](../repos/aws-s3.md), [TestRail](../repos/testrail.md)

## Business Features

- Loan origination and purchase simulation
- Interest calculation and accrual
- Volume fee processing and true-up calculations
- Loan type grooming and investor changes
- Servicing data ingestion and validation
- Fee collection on loan origination
- Pass-through interest calculations
- Auto purchase flow testing

## APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/Accounting/v1/LoanAccounting/LoanActionsAccounts` | Get account configurations for loan actions |
| POST | `/Accounting/v1/LoanAccounting/ChangeLoanTypeAccounts` | Get accounts for loan type changes |
| GET | `/core/v1/dda/accounts/{account_number}` | Get account balance for a standard account |
| GET | `/core/v1/dda/subaccounts/{account_number}` | Get account balance for a sub-account |
| GET | `/init/{mpl_id}/{issuing_bank_id}/{loan_type}/{objective}/{account_number}/{is_subaccount}` | Initialize account configuration |
| POST | `/payment` | Process payment transactions |

## Dependencies

- **cos-simulator** (http)
- **rabbitmq** (messaging)
- **accounts-resolver** (http)
- **web-api** (http)
- **hooks-e2e** (http)
- **source_db** (database)
- **tests_db** (database)
- **dbt-e2e** (shared-lib)

## Data Entities

- **Loan** — Represents a loan with attributes like loan_id, mpl_id, issuing_bank_id, loan_type, loan_amount, interest_rate, etc.
- **Contract** — Defines the terms of lending between partners, including fees, interest calculation methods, and timing
- **Batch** — Represents a group of loans being processed together during purchase
- **Transfer** — Represents a financial transaction between accounts
- **LoanAction** — Represents actions performed on loans such as purchase or fee collection
- **AccountConfig** — Configuration of accounts used for various financial operations

> See also: [Data Model](../data-model/entities.md)

## Messaging Patterns

- **SQS Payment Queue** (queue) — Asynchronous messaging for payment processing from COS simulator to web-api
- **RabbitMQ Hooks** (event) — Event-driven notifications for loan status changes, batch completions, and other important system events
- **Transfer Outbox** (outbox) — Outbox pattern implementation for reliable transfer processing

## External Integrations

- **AWS S3** — bidirectional via file
- **Arix DB** — upstream via database
- **COS (Core Operating System)** — downstream via REST
- **Test Rail** — upstream via REST

> See also: [Integrations Overview](../integrations/overview.md)

## Architecture Patterns

- Microservices
- Event-driven architecture
- Outbox pattern
- Docker containerization
- Time simulation (time travel)
- Mock services

## Tech Stack

- Python
- FastAPI
- Docker
- PostgreSQL
- Microsoft SQL Server
- AWS (SQS, S3)
- RabbitMQ
- DBT (Data Build Tool)
- Pandas
- SQLAlchemy

## Findings

### [HIGH] Suboptimal transaction monitoring

**Category:** optimization  
**Files:** modules/e2e/src/assertions/batch_assertions.py, modules/e2e/src/assertions/interest_assertions.py

The code uses polling patterns with hardcoded sleep intervals to monitor transaction completion, which could be inefficient and fragile. The application would benefit from an event-driven approach to reduce resource consumption and improve reliability.
### [HIGH] Manual service orchestration

**Category:** architecture  
**Files:** modules/e2e/src/airflow.py, modules/e2e/src/runner.py

The tests rely on manual orchestration of multiple dependent services with fragile timing assumptions. Implementing a proper service coordination pattern with health checks would improve test stability and reliability.

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-13T06:20:47.565Z*