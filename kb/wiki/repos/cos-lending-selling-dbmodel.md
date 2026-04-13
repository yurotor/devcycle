# Cos.Lending.Selling.DbModel

## Purpose

This repository serves as the database model and context for the Cos.Lending.Selling system, defining the data schema and relationships for a financial loan selling and servicing platform. It provides entity models, configurations, and migration capabilities to support the persistence layer of the lending system.

## Features Implemented

- [Loan Purchase and Funding](../features/loan-purchase-and-funding.md)
- [Daily Interest Accrual and Collection](../features/daily-interest-accrual-and-collection.md)
- [Fee Management and Collection](../features/fee-management-and-collection.md)
- [Volume Fee Calculation and True-Up](../features/volume-fee-calculation-and-true-up.md)
- [Loan Grooming (Investor and Type Changes)](../features/loan-grooming-investor-and-type-changes.md)
- [AI-Powered Loan History Queries](../features/ai-powered-loan-history-queries.md)
- [Servicing Data Ingestion and Reconciliation](../features/servicing-data-ingestion-and-reconciliation.md)
- [Event Notifications and Hooks](../features/event-notifications-and-hooks.md)
- [Transfer Monitoring and Status Sync](../features/transfer-monitoring-and-status-sync.md)
- [Reporting and Analytics](../features/reporting-and-analytics.md)
- [Account Resolution and Mapping](../features/account-resolution-and-mapping.md)

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

*Generated: 2026-04-13T06:20:47.565Z*