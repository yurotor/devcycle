# COS.Lending.Selling.WebApi

## Purpose

The COS.Lending.Selling.WebApi repository is a .NET backend service for managing loan selling and purchasing operations between Marketplace Lenders (MPLs) and investors in a financial ecosystem.

## Communicates With

[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS (Core Operating System)](../repos/cos-core-operating-system.md), [CRB.CosLending.Accounting.Api](../repos/crb-coslending-accounting-api.md), [AWS S3](../repos/aws-s3.md)

## Features Implemented

- [Loan Purchase and Funding](../features/loan-purchase-and-funding.md)
- [Daily Interest Accrual and Collection](../features/daily-interest-accrual-and-collection.md)
- [Fee Management and Collection](../features/fee-management-and-collection.md)
- [Volume Fee Calculation and True-Up](../features/volume-fee-calculation-and-true-up.md)
- [Loan Grooming (Investor and Type Changes)](../features/loan-grooming-investor-and-type-changes.md)
- [Loan Inventory Management](../features/loan-inventory-management.md)
- [Event Notifications and Hooks](../features/event-notifications-and-hooks.md)
- [Transfer Monitoring and Status Sync](../features/transfer-monitoring-and-status-sync.md)
- [Reporting and Analytics](../features/reporting-and-analytics.md)
- [Account Resolution and Mapping](../features/account-resolution-and-mapping.md)

## Business Features

- Loan purchasing and funding process management
- Loan grooming (changing investor or loan type)
- Interest accrual and fee collection
- Volume fee calculation and collection
- Daily interest calculation and processing
- Monthly minimum fee calculation and processing
- Auto-purchase of eligible loans
- Batch processing of loan purchases
- Reconciliation of loan discrepancies
- Transfer monitoring and status synchronization
- Reporting generation for pre-sale and post-sale activities

## APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| undefined | `undefined` | undefined |
| undefined | `undefined` | undefined |
| undefined | `undefined` | undefined |
| undefined | `undefined` | undefined |
| undefined | `undefined` | undefined |
| undefined | `undefined` | undefined |
| undefined | `undefined` | undefined |
| undefined | `undefined` | undefined |
| undefined | `undefined` | undefined |

## Dependencies

- **undefined** (undefined)
- **undefined** (undefined)
- **undefined** (undefined)
- **undefined** (undefined)
- **undefined** (undefined)
- **undefined** (undefined)

## Data Entities

- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined
- **undefined** — undefined

> See also: [Data Model](../data-model/entities.md)

## External Integrations

- **undefined** — undefined via undefined
- **undefined** — undefined via undefined
- **undefined** — undefined via undefined
- **undefined** — undefined via undefined
- **undefined** — undefined via undefined

> See also: [Integrations Overview](../integrations/overview.md)

## Architecture Patterns

- Outbox pattern for reliable message processing
- Repository pattern for data access
- Background services for async processing
- Functional core, imperative shell architecture (F# core business logic)
- Multi-language architecture (F# for business logic, C# for infrastructure)
- CQRS-like separation between read and write operations
- Domain-Driven Design influences in entity modeling
- Message-based integration using queues

## Tech Stack


---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-13T06:20:47.564Z*