# Core Lending Selling Domain

## Shared Entities

- **Loan** — Core domain entity representing loans with attributes like ID, status, and amount; defined in Contracts, persisted in DbModel, and exposed through WebApi ([Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **Investor** — Entity that purchases loans, defined in Contracts and stored in DbModel ([Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Bank** — Financial institution that originates or services loans, defined in Contracts and stored in DbModel ([Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Mpl** — Marketplace lender entity that purchases loans from banks, defined in Contracts and stored in DbModel ([Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Batch** — Groups multiple loans for bulk processing, defined as BatchInfo in Contracts, persisted in DbModel, and managed through WebApi ([Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **Transfer** — Represents movement of loans between entities or accounts, stored in DbModel and exposed through WebApi endpoints ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))

## Data Flows

### Loan Purchase Flow

End-to-end process where an MPL purchases loans from a bank

  1. MPL initiates purchase via WebApi
  2. System creates Invoice (from Contracts)
  3. WebApi processes purchase and creates Transfer records
  4. TransferOutbox ensures reliable processing of transfers
  5. Receipt (from Contracts) generated to confirm purchase
### Interest Accrual Flow

Daily calculation and application of interest to loans

  1. WebApi triggers daily interest calculation
  2. System calculates interest using SofrRate from Contracts
  3. Interest is recorded in InterestHistory in DbModel
  4. DailyInterestOutbox publishes results
  5. InterestHistory is updated in the database
### Fee Collection Flow

Process for collecting various fees related to loan servicing

  1. WebApi identifies fees due
  2. Fee entities created in DbModel
  3. FeeOutbox ensures reliable fee processing
  4. Volume fees are processed via VolumeFeeOutbox
  5. True-up adjustments handled by TrueUpVolumeFeeOutbox

## Integration Points

- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[COS.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)** via Entity Framework Core: WebApi reads and writes loan, account, and transaction data to the database via DbModel entities
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)** via Shared Library: WebApi uses data contracts from Contracts for consistent data exchange with external systems
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cross River Bank COS](../repos/cross-river-bank-cos.md)** via REST API: WebApi integrates with bank systems for loan origination and servicing information
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[AWS S3](../repos/aws-s3.md)** via REST API: WebApi stores reports and documents in S3 storage
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[External Systems](../repos/external-systems.md)** via Outbox Pattern: Various outbox tables ensure reliable message delivery to external systems for transfers, fees, batches, and notifications

## Patterns

- **Outbox Pattern** — Used for reliable message delivery to external systems, ensuring transactional consistency between database changes and message publishing ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))
- **Shared Contracts** — Common data models defined in a shared contracts library to maintain consistency across services ([Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md))
- **Repository Pattern** — Encapsulates database access through entity models and contexts ([Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **REST API** — Exposes domain functionality through RESTful endpoints ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md))

## Open Questions

- Cos.Lending.Selling.DbModel: The relationship between LoanAccount and the Account entity is unclear - whether it's a join table or serves another purpose
- COS.Lending.Selling.WebApi: The specific business rules governing when loans can be transferred between accounts are not explicitly defined
- Cos.Lending.Selling.Contracts: The calculation methodology for SofrRate and how it affects interest calculations is not fully documented
- COS.Lending.Selling.WebApi: The exact workflow for resolving Discrepancies identified between loan and reference data is not defined
- Cos.Lending.Selling.DbModel: The lifecycle management of the LoanEvent entity and what triggers various event types is not explicit

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-12T14:23:22.319Z*