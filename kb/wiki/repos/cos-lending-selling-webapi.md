# COS.Lending.Selling.WebApi

## Purpose

The repository serves as a backend WebAPI for loan management in a lending platform, specifically handling the selling and purchasing of loans. It enables MPLs (Marketplace Lenders) to purchase loans and manage loan lifecycle operations including transfers, fees, interest accruals, and investor relationship management.

## Communicates With

[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Contracts](../repos/cos-lending-contracts.md), [COS.Lending.Hooks](../repos/cos-lending-hooks.md), [COS.Lending.Accounting](../repos/cos-lending-accounting.md), [COS Storage Service](../repos/cos-storage-service.md), [COS Transaction Service](../repos/cos-transaction-service.md), [AWS SQS](../repos/aws-sqs.md)

## Features Implemented

- [Loan Purchase and Selling](../features/loan-purchase-and-selling.md)
- [Interest Accrual](../features/interest-accrual.md)
- [Volume Fee Processing](../features/volume-fee-processing.md)
- [Loan Grooming and Type Changes](../features/loan-grooming-and-type-changes.md)
- [Batch Reporting](../features/batch-reporting.md)
- [Auto Purchase Flow](../features/auto-purchase-flow.md)

## Business Features

- Loan purchasing and selling
- Interest accrual and management
- Fee collection and processing
- Batch processing of loans
- Reconciliation and reporting
- Loan grooming and type changes
- Volume fee processing
- Automated loan purchasing
- Transfer management

## APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/loans` | Retrieve loans with filtering options |
| GET | `/api/loans/{id}` | Get details for a specific loan |
| GET | `/api/batches` | Get information about loan batches |
| POST | `/api/reports` | Generate pre-sale or post-sale loan reports |
| POST | `/api/transfers` | Initiate funds transfers between accounts |

## Dependencies

- **COS.Lending.Contracts** (http)
- **COS.Lending.Hooks** (http)
- **COS.Lending.Accounting** (http)
- **COS Storage Service** (http)
- **COS Transaction Service** (http)
- **AWS SQS** (messaging)
- **PostgreSQL** (database)

## Data Entities

- **Loan** — Represents a loan with its details, status, and relationship to other entities
- **LoanAction** — Tracks actions performed on loans such as purchases, interest accruals, and fee collections
- **Transfer** — Represents a financial transfer between accounts with status tracking
- **Contract** — Defines relationship between MPL and bank with terms for loan operations
- **Account** — Banking account used for transfers and financial operations
- **Batch** — Groups multiple loans for bulk processing
- **InterestHistory** — Tracks interest accruals for loans over time
- **VolumeFeeMonthlyMinimum** — Tracks minimum fee requirements for MPLs

> See also: [Data Model](../data-model/entities.md)

## Messaging Patterns

- **TransferOutbox** (outbox) — Ensures reliable processing of transfer requests to external systems
- **NotificationOutbox** (outbox) — Manages notifications to be sent to external systems
- **BatchInitOutbox** (outbox) — Handles batch initialization processing
- **FeeOutbox** (outbox) — Manages fee collection processing
- **VolumeFeeOutbox** (outbox) — Processes volume-based fees for loans
- **TrueUpVolumeFeeOutbox** (outbox) — Handles true-up volume fee processing
- **ReportingOutbox** (outbox) — Manages report generation requests
- **DailyInterestOutbox** (outbox) — Processes daily interest accruals
- **SQS Message Handling** (queue) — Processes messages from AWS SQS for reliable background processing

## External Integrations

- **Cross River Bank COS** — bidirectional via REST
- **AWS S3** — downstream via REST
- **Lending Contracts Service** — upstream via REST
- **Hooks Notification Service** — downstream via REST
- **Lending Accounting Service** — bidirectional via REST

> See also: [Integrations Overview](../integrations/overview.md)

## Architecture Patterns

- Outbox pattern
- Repository pattern
- Functional core/imperative shell
- Background processing services
- Multi-tenant architecture
- Event-driven architecture
- Microservices
- CQRS

## Tech Stack

- .NET 8.0
- F# (business logic)
- C# (API layer and infrastructure)
- PostgreSQL 16.2
- AWS SQS
- Entity Framework Core
- Docker
- Quartz.NET
- CSV Helper

## Findings

### [HIGH] Insecure credentials handling in docker-compose

**Category:** security  
**Files:** .devcontainer/docker-compose.yml

Hard-coded database credentials are present in docker-compose.yml. Credentials should be moved to environment variables or secrets management.
### [HIGH] Missing idempotency in outbox processors

**Category:** architecture  
**Files:** CRB.COS.Lending.Selling.OutboxProcessors/Processors/BatchInitOutboxProcessor.cs, CRB.COS.Lending.Selling.OutboxProcessors/Processors/MaturedLoansOutboxProcessor.cs

While some outbox processors check for duplicates, others don't implement proper idempotency checks, which could lead to duplicate operations if processors are restarted.

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-12T12:37:55.011Z*