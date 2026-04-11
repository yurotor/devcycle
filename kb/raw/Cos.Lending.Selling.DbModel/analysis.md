# Cos.Lending.Selling.DbModel

## Purpose
This repository provides the database model and context for a lending and selling system within a financial services application. It defines entities, relationships, and database operations for managing loans, accounts, fees, transfers, and other financial transactions in a multi-tenant architecture.

## Business Features
- Loan origination and management
- Fee calculation and processing
- Interest calculation and accrual
- Investor management
- Contract and transfer management
- Multi-tenant authorization
- Transaction batch processing
- Account management
- Volume fee calculation
- Reporting capabilities

## Dependencies
- **Npgsql.EntityFrameworkCore.PostgreSQL** (database)
- **Microsoft.EntityFrameworkCore** (shared-lib)

## Data Entities
- **Account** — Represents financial accounts in the system
- **Loan** — Core entity representing loan products with their characteristics
- **Investor** — Entity representing investors who purchase loans
- **Transfer** — Represents transfers of loans between accounts or entities
- **Contract** — Represents legal agreements for loans
- **Fee** — Represents various fees applied to loans or accounts
- **InterestHistory** — Tracks historical interest calculations for loans
- **Mpl** — Mortgage Program Lending configuration and details
- **Batch** — Batch operations for processing multiple records
- **LoanEvent** — Events that occur during loan lifecycle
- **Servicing** — Loan servicing information and configurations

## Messaging Patterns
- **BatchInitOutbox** (outbox) — Outbox pattern for batch initialization messages
- **DailyInterestOutbox** (outbox) — Outbox pattern for daily interest calculation messages
- **FeeOutbox** (outbox) — Outbox pattern for fee processing messages
- **TransferOutbox** (outbox) — Outbox pattern for transfer operation messages
- **VolumeFeeOutbox** (outbox) — Outbox pattern for volume fee calculation messages
- **NotificationOutbox** (outbox) — Outbox pattern for notification messages
- **ReportingOutbox** (outbox) — Outbox pattern for reporting data messages

## Architecture Patterns
- Repository Pattern
- Outbox Pattern
- Entity-Attribute-Value Pattern
- Multi-tenant Architecture
- Domain-Driven Design

## Tech Stack
- .NET Core
- Entity Framework Core
- PostgreSQL
- C#
- Npgsql

## Findings
### [HIGH] Multiple dead letter queues without handling mechanism

**Category:** architecture  
**Files:** CRB.Cos.Lending.Selling.DbContext/DbModel/BatchInitOutboxDeadLetter.cs, CRB.Cos.Lending.Selling.DbContext/DbModel/DailyInterestOutboxDeadLetter.cs, CRB.Cos.Lending.Selling.DbContext/DbModel/FeeOutboxDeadLetter.cs

The repository contains multiple dead letter entities (e.g., BatchInitOutboxDeadLetter, FeeOutboxDeadLetter) but lacks visible mechanisms for handling or processing these dead letters. This could lead to unprocessed messages and system inconsistencies. Implement a dead letter processing strategy or monitoring system.
### [HIGH] Multi-tenant data access control lacks clear enforcement

**Category:** security  
**Files:** CRB.Cos.Lending.Selling.Authorization/Tenant.cs, CRB.Cos.Lending.Selling.Authorization/TenantProvider.cs

While there's a tenant authorization structure in place, the repository doesn't show clear enforcement mechanisms for tenant-based data isolation in database queries. This could potentially allow data leakage between tenants. Implement consistent tenant filtering in all data access queries.
