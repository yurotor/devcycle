# Cos.Lending.Selling.DbModel

## Purpose
This repository provides the database model and context for the Cos Lending Selling system, which appears to be a financial lending and loan servicing platform. It defines the data entities, relationships, and database interactions required to support loan management, interest calculations, fee processing, and investor operations.

## Business Features
- Loan origination and servicing
- Loan transfer and selling to investors
- Interest calculation and accrual
- Fee management and charging
- Batch processing for loan operations
- Multi-tenant architecture with role-based access
- Contract management
- Volume fee calculations
- Automated loan purchasing

## Dependencies
- **EntityFrameworkCore** (shared-lib)
- **Npgsql.EntityFrameworkCore.PostgreSQL** (database)

## Data Entities
- **Loan** — Represents a financial loan with its associated details and status
- **LoanAccount** — Links loans to accounts for financial tracking
- **Account** — Represents a financial account in the system
- **Transfer** — Represents the transfer of a loan between parties
- **Contract** — Represents a legal agreement between parties
- **InterestHistory** — Tracks historical interest calculations for loans
- **Investor** — Represents entities that invest in or purchase loans
- **Fee** — Represents fees charged in loan transactions
- **FeeSweep** — Represents fee collection events
- **Batch** — Groups related operations for processing together
- **Mpl** — Marketplace lending entity that originates loans
- **Bank** — Financial institution entity involved in lending
- **Servicing** — Represents loan servicing operations and status
- **Sofr** — Secured Overnight Financing Rate data for interest calculations

## Messaging Patterns
- **TransferOutbox** (outbox) — Ensures reliable message delivery for loan transfer events
- **FeeOutbox** (outbox) — Ensures reliable message delivery for fee-related events
- **BatchInitOutbox** (outbox) — Ensures reliable message delivery for batch initialization events
- **DailyInterestOutbox** (outbox) — Ensures reliable message delivery for daily interest calculation events
- **MaturedLoanOutbox** (outbox) — Ensures reliable message delivery for loan maturity events
- **NotificationOutbox** (outbox) — Ensures reliable message delivery for notification events
- **ReportingOutbox** (outbox) — Ensures reliable message delivery for reporting events
- **TrueUpVolumeFeeOutbox** (outbox) — Ensures reliable message delivery for volume fee adjustments
- **VolumeFeeOutbox** (outbox) — Ensures reliable message delivery for volume fee events

## Architecture Patterns
- Repository Pattern
- Entity Framework Core ORM
- Outbox Pattern
- Multi-tenant architecture
- Database Migration Management

## Tech Stack
- .NET Core
- Entity Framework Core
- PostgreSQL
- Npgsql
- Jenkins CI/CD

## Findings
### [HIGH] Outbox Pattern Implementation Risk

**Category:** architecture  
**Files:** CRB.Cos.Lending.Selling.DbContext/DbModel/TransferOutbox.cs, CRB.Cos.Lending.Selling.DbContext/DbModel/FeeOutbox.cs, CRB.Cos.Lending.Selling.DbContext/DbModel/TransferOutboxDeadLetter.cs, CRB.Cos.Lending.Selling.DbContext/DbModel/FeeOutboxDeadLetter.cs

The repository uses multiple outbox tables with corresponding dead letter tables but lacks visible processing or retry logic, risking message loss during system failures. Implement comprehensive outbox message processing with monitoring and alerting.
