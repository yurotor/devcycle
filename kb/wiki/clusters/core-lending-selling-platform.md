# Core Lending Selling Platform

## Shared Entities

- **Loan** — Core entity representing a financial loan with attributes like ID, status, amount, and interest rate. Defined in Contracts, persisted in DbModel, and operated on via WebApi. ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Account** — Banking account used for transfers and financial operations. Defined in DbModel and manipulated through WebApi endpoints. ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Transfer** — Represents movement of funds between accounts with status tracking. Defined in DbModel and initiated via WebApi endpoints. ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Batch** — Groups multiple loans for bulk processing. Defined as BatchInfo in Contracts, persisted in DbModel, and queried via WebApi. ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **InterestHistory** — Tracks interest accruals for loans over time. Defined in DbModel and processed via WebApi's interest accrual flows. ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))

## Data Flows

### Loan Purchase Flow

End-to-end flow for MPLs to purchase loans from banks

  1. Loan details defined in Contracts
  2. Purchase request initiated via WebApi
  3. Data persisted to database via DbModel
  4. Transfer created for funds movement
  5. Notification sent via NotificationOutbox
### Interest Accrual Flow

Daily process for calculating and applying interest to loans

  1. DailyInterestOutbox triggered from WebApi
  2. Interest calculated based on loan terms from DbModel
  3. Interest history recorded in database
  4. Notifications sent to relevant parties
### Fee Processing Flow

Process for collecting and managing fees associated with loans

  1. Fee events triggered via WebApi
  2. Fee calculations based on contracts and volume
  3. FeeOutbox/VolumeFeeOutbox message published
  4. Fee data persisted in DbModel
  5. Transfer initiated for fee collection
### Reporting Flow

Generation of pre-sale and post-sale loan reports

  1. Report request via WebApi POST /api/reports
  2. Data gathered from DbModel entities
  3. ReportingOutbox message published
  4. Report generated and stored in AWS S3
  5. Notification of report availability

## Integration Points

- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)** via direct-reference: WebApi uses DbModel to persist and retrieve loan and account data
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)** via direct-reference: WebApi uses Contracts to define data structures for API request/response models
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[Cross River Bank COS](../repos/cross-river-bank-cos.md)** via REST: Bidirectional integration for loan data exchange with the bank's core system
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[COS.Lending.Contracts](../repos/cos-lending-contracts.md)** via HTTP: Retrieves contract information to validate loan operations
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[COS.Lending.Accounting](../repos/cos-lending-accounting.md)** via HTTP: Bidirectional integration for financial accounting operations related to loans
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** → **[AWS SQS](../repos/aws-sqs.md)** via messaging: Uses SQS for reliable background processing of loan operations
- **[COS.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)** → **[PostgreSQL](../repos/postgresql.md)** via Entity Framework Core: Persists all loan, account, and transaction data to PostgreSQL database

## Patterns

- **Outbox Pattern** — Used for reliable asynchronous processing across multiple services ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Repository Pattern** — Abstracts data access logic from business logic ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))
- **Shared Contract Model** — Common entity definitions shared across services ([Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md))
- **Batch Processing** — Groups multiple operations for efficiency ([COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md))

## Open Questions

- In COS.Lending.Selling.WebApi, the business rules for loan transfer eligibility based on account types need more explicit definition
- In Cos.Lending.Selling.Contracts, the specific mappings and display logic for LoanInfo's field1-field21 properties are not clearly defined
- In Cos.Lending.Selling.DbModel, the specific constraints and validation rules for the one-to-many relationship between LoanAccount and Account are not explicitly defined
- The exact algorithm for interest calculation referenced in DailyInterestOutbox is not explicitly defined in any repository

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-13T06:16:29.480Z*