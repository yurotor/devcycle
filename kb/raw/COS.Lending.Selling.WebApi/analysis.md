# COS.Lending.Selling.WebApi

## Purpose
The COS.Lending.Selling.WebApi repository provides functionality for managing loan selling operations between Marketplace Lenders (MPLs) and investors. It handles the purchase of loans, fee collections, interest calculations, and reconciliation processes within Cross River Bank's lending ecosystem.

## Business Features
- Loan purchase processing
- Fee collection and management
- Daily interest accrual and calculation
- Transfer management between accounts
- Loan grooming and preparation for sale
- Volume fee collection and monthly minimum requirements
- Reporting for pre-sale and post-sale loans
- Loan discrepancy detection and reconciliation
- Batch processing of loan transactions
- Auto-purchase of eligible loans

## APIs
- **POST /api/loan/purchase** — Initiates the purchase of loans from MPLs
- **GET /api/report/presale** — Generates pre-sale loan reports for MPLs and investors
- **GET /api/report/postsale** — Generates post-sale loan reports for processed batches
- **POST /api/batch/complete** — Completes a batch of loan purchases
- **POST /api/grooming** — Prepares loans for sale by grooming them to meet requirements

## Dependencies
- **COS.Lending.Contracts** (http)
- **COS.Lending.Accounting** (http)
- **COS.Storage** (http)
- **Hooks** (http)
- **Postgres** (database)
- **AWS SQS** (messaging)

## Data Entities
- **Loan** — Represents a loan to be purchased from an MPL
- **LoanAction** — Represents an action performed on a loan (purchase, fee collection, interest accrual)
- **Transfer** — Represents a money transfer between accounts for various operations
- **Contract** — Defines the agreement terms between MPL and bank, including fee structures
- **Account** — Represents various accounting accounts involved in loan transactions
- **Batch** — Represents a batch of loans processed together
- **VolumeFee** — Represents fees collected based on loan volume

## Messaging Patterns
- **TransferOutbox** (outbox) — Ensures reliable processing of transfers by storing them before execution
- **DailyInterestOutbox** (outbox) — Manages accrual of daily interest on loans
- **FeeOutbox** (outbox) — Manages the collection of various fees
- **NotificationOutbox** (outbox) — Manages sending notifications to external systems
- **ReportingOutbox** (outbox) — Manages the generation and storage of reports
- **SQS Message Queue** (queue) — Handles asynchronous processing of messages between system components

## External Integrations
- **COS (Core Operating System)** — bidirectional via REST
- **AWS S3 Storage** — upstream via REST
- **Hooks Notification System** — downstream via REST
- **AWS SQS** — bidirectional via messaging

## Architecture Patterns
- Outbox Pattern
- Repository Pattern
- Background Processing
- Microservices
- Event-Driven Architecture
- Domain-Driven Design
- CQRS (Command Query Responsibility Segregation)

## Tech Stack
- .NET 8
- F#
- C#
- Postgres
- Entity Framework Core
- AWS SQS
- AWS S3
- Docker
- Quartz.NET
- CsvHelper

## Findings
### [HIGH] Embedded SQS credentials in code

**Category:** security  
**Files:** CRB.COS.Lending.Selling.OutboxProcessors/Services/MessageDispatcherService.cs

The application appears to have AWS SQS access credentials in environment variables or configuration. This creates security risk if these credentials are ever exposed. Recommended to use IAM roles or secure credential management.
### [HIGH] Missing error handling in outbox processors

**Category:** architecture  
**Files:** CRB.COS.Lending.Selling.OutboxProcessors/OutboxProcessorBase.cs

Several outbox processors lack comprehensive error handling which could lead to message loss or processing failures. Implement proper retry mechanisms and dead letter queues for all processors.
### [HIGH] Inefficient batch processing patterns

**Category:** optimization  
**Files:** CRB.Cos.Lending.Selling.BusinessLogic/PurchaseLoans.fs

Current implementation processes loans in batches but does not optimize database operations for large batches, which could lead to performance issues with large loan volumes. Implement chunked processing with optimized database access.
