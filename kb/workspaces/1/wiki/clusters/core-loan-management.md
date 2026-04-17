# Core Loan Management

## Shared Entities

- **Loan** — Core entity representing a financial loan with properties such as ID, number, status, amount, and interest rate that flows between all components of the system ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md))
- **Account** — Represents banking accounts used for transfers and financial operations in the loan selling process ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Transfer** — Represents financial transfers between accounts with status tracking for loan operations ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Contract** — Defines relationship between MPL and bank with terms for loan operations ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Batch** — Groups multiple loans for bulk processing operations across the system ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md))
- **InterestHistory** — Tracks interest accruals and calculations for loans over time ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))

## Data Flows

### Loan Purchase Flow

Process of marketplace lenders purchasing loans through the platform

  1. Contract terms established between MPL and bank
  2. Loans grouped into batches for purchase
  3. Purchase invoice generated with loan details
  4. Transfer of funds initiated between accounts
  5. Receipt generated confirming successful purchase
  6. Notifications sent to relevant parties
### Interest Accrual Flow

Daily process of calculating and applying interest to loans

  1. Daily interest calculations triggered via outbox pattern
  2. Interest rates (potentially including SOFR rates) applied to loan balances
  3. Interest history records created or updated
  4. Accounting service notified of interest accruals
### Fee Management Flow

Process for calculating, collecting and distributing various fees

  1. Regular fee calculations performed based on loan activity
  2. Volume-based fees calculated with monthly minimums applied
  3. True-up adjustments made to ensure fee compliance
  4. Fee collection transfers initiated
  5. Accounting system updated with fee information

## Integration Points

- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)** via shared-db: Web API uses DbModel as its persistence layer, storing and retrieving loan, account, transfer and other entity data
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)** via shared-lib: Web API depends on Contracts to define data structures for loan selling operations and external service communications
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[external-systems](../repos/external-systems.md)** via outbox-pattern: Multiple outbox patterns ensure reliable message delivery to external systems for transfers, notifications, batch operations, fees, and interest calculations
- **[COS.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)** → **[external-systems](../repos/external-systems.md)** via outbox-tables: Database tables implement outbox pattern storing events for asynchronous processing by external systems

## Patterns

- **Outbox Pattern** — Used extensively for reliable message delivery and event publishing to ensure consistency between the database and downstream systems ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Repository Pattern** — Used to abstract database operations and provide clean domain model interactions ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Contract-First Design** — Shared contracts repository defines data structures used across services to ensure consistency ([Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md))
- **Event-Driven Architecture** — System uses events via outboxes to coordinate processes across services and ensure reliable background processing ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))

## Open Questions

- In COS.Lending.Selling.WebApi, the exact triggers for interest accrual calculations (whether time-based, event-based, or manual) are not clearly defined
- In Cos.Lending.Selling.DbModel, the relationship between LoanAccount and Loan entities and when each is used is ambiguous
- In Cos.Lending.Selling.Contracts, the exact relationship between Invoice and Receipt entities and how they map to the purchase flow is unclear

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-16T12:55:41.326Z*