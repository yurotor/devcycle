# Cos.Lending.Selling.DbModel

## Purpose

This repository serves as the database model and context for the Cos.Lending.Selling system, defining the data schema and relationships for a financial loan selling and servicing platform. It provides entity models, configurations, and migration capabilities to support the persistence layer of the lending system.

## Communicates With

[PostgreSQL Selling Database](../repos/postgresql-selling-database.md)

## Features Implemented

- [Loan Purchase Management](../features/loan-purchase-management.md)
- [Daily Interest Accrual](../features/daily-interest-accrual.md)
- [Volume Fee Collection and True-Up](../features/volume-fee-collection-and-true-up.md)
- [Multi-Fee Type Processing](../features/multi-fee-type-processing.md)
- [Loan Data Ingestion and Synchronization](../features/loan-data-ingestion-and-synchronization.md)
- [Servicing Data Import from S3](../features/servicing-data-import-from-s3.md)
- [AI-Powered Loan History Chat](../features/ai-powered-loan-history-chat.md)
- [Loan Grooming and Type Changes](../features/loan-grooming-and-type-changes.md)
- [Event Notification System](../features/event-notification-system.md)
- [Batch Processing and Completion](../features/batch-processing-and-completion.md)
- [Transfer Status Synchronization](../features/transfer-status-synchronization.md)
- [Account Resolution and Mapping](../features/account-resolution-and-mapping.md)
- [Role-Based Access Control](../features/role-based-access-control.md)

## Business Features

- Loan origination and management
- Interest calculation and tracking
- Fee processing and management
- Loan transfers and sales
- Contract management
- MPL (Marketplace Lending) program management
- Investor relationship management
- Loan grooming and seasoning
- Volume fee calculations
- Batch processing of financial transactions

## Dependencies

- **Entity Framework Core** (shared-lib)
- **Npgsql Entity Framework Core Provider** (shared-lib)
- **PostgreSQL** (database)

## Data Entities

- **Account** — Represents a financial account in the system
- **Loan** — Core entity representing a loan with its properties and status
- **Contract** — Represents legal agreements between parties for loan sales or services
- **Investor** — Entity representing organizations or individuals who invest in loans
- **Bank** — Financial institution that originates or services loans
- **Fee** — Represents various fees associated with loan servicing and processing
- **Transfer** — Represents movement of loans between entities or accounts
- **Batch** — Groups multiple operations for processing together
- **InterestHistory** — Tracks interest calculations and changes over time
- **Mpl** — Marketplace Lending entity representing lending platforms
- **LoanAccount** — Links loans to specific accounts
- **LoanEvent** — Captures significant events in a loan's lifecycle
- **Servicing** — Represents loan servicing details and configurations

> See also: [Data Model](../data-model/entities.md)

## Messaging Patterns

- **TransferOutbox** (outbox) — Ensures reliable delivery of transfer events to other systems
- **FeeOutbox** (outbox) — Ensures reliable delivery of fee-related events
- **BatchInitOutbox** (outbox) — Publishes batch initialization events to other systems
- **DailyInterestOutbox** (outbox) — Publishes daily interest calculation results
- **NotificationOutbox** (outbox) — Ensures reliable delivery of system notifications
- **VolumeFeeOutbox** (outbox) — Publishes volume fee calculation events
- **ReportingOutbox** (outbox) — Ensures reliable delivery of reporting data
- **MaturedLoanOutbox** (outbox) — Publishes events when loans reach maturity
- **TrueUpVolumeFeeOutbox** (outbox) — Publishes true-up volume fee adjustments

## Architecture Patterns

- Repository Pattern
- Entity-Relationship Model
- Outbox Pattern
- Fluent API Configuration
- Code-First Database Migrations
- Multi-tenant Architecture

## Tech Stack

- .NET Core
- Entity Framework Core
- PostgreSQL
- Npgsql
- C#

## Findings

### [HIGH] Lack of consistent tenant isolation

**Category:** architecture  
**Files:** CRB.Cos.Lending.Selling.Authorization/Tenant.cs, CRB.Cos.Lending.Selling.Authorization/TenantProvider.cs

The system has a multi-tenant architecture with different tenant types (SellingITAdmin, InternalTenant, MplTenant, BankTenant, InvestorTenant), but the database schema doesn't consistently enforce tenant isolation across all entities. This could lead to data leakage between tenants if application-level security is bypassed.

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-16T13:01:33.725Z*