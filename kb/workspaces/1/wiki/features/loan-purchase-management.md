# Loan Purchase Management

## 1. Overview

The Loan Purchase Management feature facilitates the complete end-to-end process for Marketplace Lenders (MPLs) and investors to discover and purchase loans from the marketplace. This critical functionality allows participants to efficiently identify suitable loans based on their criteria, group them into batches, generate appropriate documentation, execute financial transfers, and confirm purchases.

The feature exists to streamline the loan acquisition workflow, reduce manual processing, minimize errors, and provide a transparent audit trail for all loan purchase activities within the Cross River Bank lending platform.

## 2. How It Works

The Loan Purchase Management workflow follows these key steps:

1. **Loan Discovery & Filtering**:
   - Users access the loan marketplace interface
   - Apply filters based on criteria like loan type, amount, risk profile, term length
   - View available loans matching their parameters

2. **Batch Creation**:
   - Selected loans are grouped into purchase batches
   - System validates loan eligibility and availability
   - Prevents duplicate selections or inclusion of already-purchased loans

3. **Invoice Generation**:
   - System calculates total purchase amounts including principal, accrued interest, and any applicable fees
   - Generates standardized invoice documents with itemized details
   - Includes purchase terms and conditions

4. **Financial Transfers**:
   - Initiates fund transfers from purchaser accounts to loan originators
   - Validates sufficient funds availability
   - Records transfer details and status

5. **Purchase Confirmation**:
   - Updates loan ownership records in the database
   - Generates confirmation receipts
   - Updates servicing arrangements if applicable
   - Notifies relevant parties of completed transaction

The system handles edge cases including partial batch purchases, interest recalculations for delayed transactions, and discrepancy resolution processes.

## 3. Repos Involved

The feature is implemented across multiple repositories:

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Provides the API endpoints that support loan purchase operations
- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) - Implements the user interface for the loan marketplace and purchase workflow
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Defines the database schema supporting loan purchases including entities for loans, batches, transfers, etc.
- [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md) - Contains the shared data models and DTOs used throughout the purchase flow

## 4. Key APIs

The Loan Purchase Management feature utilizes these primary API endpoints:

- `GET /api/loans` - Retrieves available loans with filtering capabilities
- `POST /api/batches` - Creates a new loan purchase batch
- `GET /api/batches/{id}` - Retrieves details for a specific batch
- `POST /api/batches/{id}/invoices` - Generates an invoice for a batch
- `POST /api/transfers` - Initiates the financial transfer for a purchase
- `POST /api/batches/{id}/confirm` - Confirms a purchase after successful transfer
- `GET /api/purchases/history` - Retrieves purchase history for an account

## 5. Data Entities

The following entities are integral to the Loan Purchase Management process:

- [Loan](../data-model/entities.md#loan) - Contains core loan information including terms, amounts, and status
- [Batch](../data-model/entities.md#batch) - Represents a collection of loans grouped for purchase
- [Invoice](../data-model/entities.md#invoice) - Documents the financial details of a purchase transaction
- [Transfer](../data-model/entities.md#transfer) - Records the movement of funds between accounts
- [Account](../data-model/entities.md#account) - Represents financial accounts for investors and MPLs
- [Investor](../data-model/entities.md#investor) - Contains information about the purchasing entity
- [Mpl](../data-model/entities.md#mpl) - Represents the Marketplace Lender entities
- [Fee](../data-model/entities.md#fee) - Records fees associated with loan purchases
- [InterestHistory](../data-model/entities.md#interesthistory) - Tracks interest accruals on loans
- [SofrRate](../data-model/entities.md#sofrrate) - Stores SOFR rates used in interest calculations

The system maintains relationships between these entities to ensure data consistency and support comprehensive audit trails throughout the purchase process.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:56:00.213Z*