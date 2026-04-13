# Core Lending Selling Infrastructure

## Shared Entities

- **Loan** — Core entity representing a financial loan with properties like ID, status, amount, interest rates. Defined as a database model, exposed via contracts, and manipulated through the API ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **Account** — Represents financial accounts used for transfers and operations, persisted in database and exposed through API endpoints ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **Transfer** — Represents movement of funds between accounts, stored in database and exposed via API endpoints ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **Batch** — Groups multiple loan operations for bulk processing, defined in database, shared through contracts, and managed via API ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **InterestHistory** — Tracks interest calculations and changes over time for loans, stored in database and processed through API ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **Investor** — Entities that purchase loans, defined in database model and exposed via contracts ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md))
- **Mpl** — Marketplace Lender entity representing lending platforms, defined in database and shared via contracts ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md))
- **Bank** — Financial institutions that originate or service loans, stored in database and exposed via contracts ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md))

## Data Flows

### Loan Purchase Flow

Process of acquiring loans from originators into the system

  1. Client initiates loan purchase request via WebAPI
  2. Loan data validated against Contract definitions
  3. Loans stored in database via DbModel entities
  4. Purchase confirmed with receipt generation
  5. Notification events published via outbox pattern
### Interest Accrual Flow

Daily process of calculating and applying interest to loans

  1. Daily trigger initiates interest calculation via WebAPI
  2. Interest computed based on loan terms and SofrRate from Contracts
  3. Results stored in InterestHistory entity via DbModel
  4. Interest updates published via DailyInterestOutbox
  5. Notifications sent to relevant systems
### Fee Processing Flow

Collection and management of various fees associated with loans

  1. Fee triggered based on schedule or event via WebAPI
  2. Fee calculated according to Contract definitions
  3. Fee records created in database via DbModel
  4. Fee collection events published via FeeOutbox
  5. Volume-based fee adjustments handled via TrueUpVolumeFeeOutbox

## Integration Points

- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)** via Direct reference/ORM: API uses DbModel for data access, persistence, and retrieval of loan and account information
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)** via Direct reference: API uses Contracts to ensure data consistency and validation when exchanging information with external systems
- **[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)** → **[External Systems](../repos/external-systems.md)** via Outbox pattern/messaging: Reliable event publishing from database changes to external systems via various outbox tables
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cross River Bank COS](../repos/cross-river-bank-cos.md)** via REST API: Bidirectional integration with bank systems for loan data synchronization and transaction processing

## Patterns

- **Outbox Pattern** — Ensures reliable event publication by storing outgoing messages in database tables before async processing ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **Repository Pattern** — Abstracts data access logic and provides consistent interface for entity operations ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **Contract-First Design** — Defines shared data contracts independently to ensure consistency across services ([Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md))
- **Batch Processing** — Groups multiple loan operations together for efficient processing and tracking ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))

## Open Questions

- How loan pricing and underwriting decisions are made during the purchase process
- Business rules for determining interest rates beyond the basic SOFR references
- Exact business logic for fee calculation formulas and when various types of fees apply
- Complete loan lifecycle states and valid transitions between different statuses
- Reconciliation process details when discrepancies are detected
- Specific business rules around investor eligibility and investment limits

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-13T06:16:29.480Z*