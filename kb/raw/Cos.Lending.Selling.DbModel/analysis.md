# Cos.Lending.Selling.DbModel

## Purpose
This repository provides data models, entity configurations, and database context for the CRB.Cos.Lending.Selling system. It serves as a central database abstraction layer for managing loans, accounts, fees, transfers, and related entities in a lending and selling system, likely for financial institutions.

## Business Features
- Loan management and servicing
- Fee calculation and collection
- Interest calculation and accrual
- Loan transfers between entities
- Contract management
- Multi-tenant authorization
- Batch processing
- Investor management
- True-up volume fee processing
- Loan discrepancy tracking

## Dependencies
- **EntityFrameworkCore** (shared-lib)
- **Npgsql.EntityFrameworkCore.PostgreSQL** (database)

## Data Entities
- **Loan** — Represents a loan entity with its associated properties
- **Account** — Represents a financial account in the system
- **Bank** — Represents a banking institution
- **Contract** — Represents a contract agreement between parties
- **Fee** — Represents fee information associated with loans or accounts
- **Transfer** — Represents transfers of loans between entities
- **InterestHistory** — Records interest calculations and history for loans
- **Investor** — Represents investors who purchase or fund loans
- **Mpl** — Marketplace lender entity and configuration
- **Batch** — Represents batch processing entities for loans
- **Servicing** — Represents loan servicing information
- **TrueUpVolumeFee** — Represents volume-based fee adjustments

## Messaging Patterns
- **TransferOutbox** (outbox) — Outbox pattern for reliable transfer events publication
- **FeeOutbox** (outbox) — Outbox pattern for reliable fee events publication
- **BatchInitOutbox** (outbox) — Outbox pattern for reliable batch initialization event publication
- **DailyInterestOutbox** (outbox) — Outbox pattern for reliable daily interest calculation event publication
- **NotificationOutbox** (outbox) — Outbox pattern for reliable notification event publication
- **ReportingOutbox** (outbox) — Outbox pattern for reliable reporting event publication
- **MaturedLoanOutbox** (outbox) — Outbox pattern for reliable matured loan event publication
- **VolumeFeeOutbox** (outbox) — Outbox pattern for reliable volume fee event publication
- **TrueUpVolumeFeeOutbox** (outbox) — Outbox pattern for reliable true-up volume fee event publication

## Architecture Patterns
- Repository Pattern
- Outbox Pattern
- Domain-Driven Design
- Entity Framework Core
- Multi-tenancy

## Tech Stack
- .NET Core
- Entity Framework Core
- PostgreSQL
- Npgsql
- C#

## Findings
### [HIGH] Dead Letter Queues without processing strategy

**Category:** architecture  
**Files:** CRB.Cos.Lending.Selling.DbContext/DbModel/BatchInitOutboxDeadLetter.cs, CRB.Cos.Lending.Selling.DbContext/DbModel/DailyInterestOutboxDeadLetter.cs, CRB.Cos.Lending.Selling.DbContext/DbModel/FeeOutboxDeadLetter.cs, CRB.Cos.Lending.Selling.DbContext/DbModel/NotificationOutboxDeadLetter.cs

The system has numerous DeadLetter tables for failed outbox message processing, but there appears to be no clear strategy or automation for handling these failed messages, which could lead to data inconsistencies if not properly monitored and resolved.
### [HIGH] Multi-tenant data access control

**Category:** security  
**Files:** CRB.Cos.Lending.Selling.Authorization/Tenant.cs, CRB.Cos.Lending.Selling.Authorization/TenantProvider.cs, CRB.Cos.Lending.Selling.Authorization/ServiceCollectionExtension.cs

The TenantProvider implementation appears to handle multi-tenancy concerns, but the actual enforcement of tenant-based data isolation at the DbContext level isn't evident. This could potentially lead to tenants accessing other tenants' data if not properly implemented throughout the application.
