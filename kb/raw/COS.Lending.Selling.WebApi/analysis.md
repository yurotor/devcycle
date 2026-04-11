# COS.Lending.Selling.WebApi

## Purpose
COS.Lending.Selling.WebApi is a .NET-based service that manages the selling and purchase of loans between marketplace lenders (MPLs) and investors. It handles loan lifecycle management including funding, purchasing, interest accrual, and fee collections, serving as a core component in Cross River Bank's lending platform.

## Business Features
- Loan purchasing and sales processing
- Interest accrual and collection
- Fee calculation and collection (Volume fees, DMV fees, Florida stamp tax, etc.)
- Grooming (changing loan attributes/investors)
- Loan reconciliation and discrepancy detection
- Loan reporting (pre-sale and post-sale reports)
- Monthly minimum fees processing
- Auto-purchase of eligible loans
- Transfer management between accounts
- Batch processing for loan operations

## APIs
- **GET /api/loans** — Retrieve loans with optional filtering
- **GET /api/loans/{id}** — Get details for a specific loan
- **POST /api/loans/purchase** — Purchase loans for an investor
- **POST /api/grooming** — Initiate grooming process for loans
- **POST /api/reports** — Generate pre-sale or post-sale loan reports

## Dependencies
- **AWS SQS** (messaging)
- **Postgres** (database)
- **COS** (http)
- **CRB.CosWrapper** (shared-lib)
- **Lending.Contracts** (http)
- **HooksService** (http)
- **Storage Service** (http)
- **Lending.Accounting** (http)

## Data Entities
- **Loan** — Represents a loan with its sale status, type and associated details
- **LoanAccount** — Account information associated with a loan for different purposes
- **Contract** — Agreement between MPL and issuing bank containing fee calculation methods
- **Transfer** — Money transfer between accounts with status tracking
- **LoanAction** — Records actions performed on loans like daily interest accrual
- **Batch** — Group of loans being processed together
- **VolumeFeeCalculationMethod** — Defines how fees are calculated for loans

## Messaging Patterns
- **DailyInterestOutbox** (outbox) — Ensures reliable processing of daily interest accruals
- **TransferOutbox** (outbox) — Handles asynchronous money transfers between accounts
- **BatchInitOutbox** (outbox) — Initiates loan batch purchases
- **FeeOutbox** (outbox) — Manages fee collections (DMV, Florida Stamp Tax, etc.)
- **NotificationOutbox** (outbox) — Sends notifications about events via hooks service
- **ReportingOutbox** (outbox) — Handles generation of pre-sale and post-sale reports
- **VolumeFeeOutbox** (outbox) — Manages volume fee collection processing
- **MaturedLoanOutbox** (outbox) — Processes matured loans for purchase

## External Integrations
- **COS (Core Operating System)** — bidirectional via REST
- **AWS SQS** — bidirectional via messaging
- **Storage Service** — downstream via REST
- **Hooks Service** — downstream via REST
- **Lending Contracts Service** — downstream via REST
- **Lending Accounting Service** — downstream via REST

## Architecture Patterns
- Microservice
- Outbox Pattern
- CQRS
- Event-driven architecture
- Repository Pattern
- Background Service Workers
- Multi-tenancy

## Tech Stack
- .NET 8
- PostgreSQL
- F#
- C#
- AWS SQS
- Entity Framework Core
- Docker
- Jenkins
- Azure DevOps
- Quartz.NET

## Findings
### [HIGH] Multi-tenancy enforcement issues

**Category:** security  
**Files:** CRB.Cos.Lending.Selling.Middlewares/PolicyTenantService.cs

The PolicyTenantService doesn't validate if the tenant has proper access to resources in some paths. Some tenant validation might be bypassed, particularly in the CRB tenant identification logic which relies only on string matching of policy names rather than proper role-based checks.
### [HIGH] Manual transaction management

**Category:** architecture  
**Files:** CRB.COS.Lending.Selling.OutboxProcessors/OutboxProcessorBase.cs, CRB.COS.Lending.Selling.OutboxProcessors/Services/MessageDispatcherService.cs

Various processors manage database transactions manually, which could lead to inconsistent state if errors occur during processing. Consider implementing a more robust transaction management approach with proper rollback mechanisms.
### [HIGH] Hardcoded credentials in docker-compose

**Category:** security  
**Files:** .devcontainer/docker-compose.yml

The docker-compose.yml file contains hardcoded database credentials. These should be externalized using environment variables or a secrets management solution.
