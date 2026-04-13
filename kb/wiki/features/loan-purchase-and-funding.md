# Loan Purchase and Funding

## 1. Overview

The Loan Purchase and Funding feature enables the acquisition of loans from Marketplace Lenders (MPLs) by investors through both automated and manual processes. This feature is a core component of the COS Lending Selling platform, serving as the transaction engine that powers the secondary loan market.

The primary purpose of this feature is to:
- Facilitate the transfer of loan assets from originators to investors
- Ensure regulatory and contractual compliance during purchases
- Execute and track financial settlements between parties
- Maintain accurate records of all transactions for accounting and audit purposes

This capability allows investors to build diversified loan portfolios while providing liquidity to MPLs and enabling Cross River Bank to function as a marketplace intermediary.

## 2. How It Works

The Loan Purchase and Funding process follows these steps:

1. **Eligibility Determination**:
   - System scans available loans from MPLs
   - Loans are matched against investor contract criteria (loan type, credit score range, interest rates, etc.)
   - Eligible loans are flagged for potential purchase

2. **Batch Creation**:
   - Loans are grouped into batches based on similar characteristics or investor requirements
   - Batches can be created automatically according to schedules or manually by operations staff
   - Each batch is assigned a unique identifier for tracking

3. **Validation and Compliance**:
   - System applies business rules to validate loan eligibility
   - Checks include regulatory compliance, contract terms adherence, and data quality
   - Discrepancies are flagged for review by operations team

4. **Purchase Execution**:
   - Upon approval, the system initiates the purchase transaction
   - Ownership of the loan is transferred in the system records
   - Financial transfers are executed between accounts

5. **Settlement and Documentation**:
   - System calculates final settlement amounts including any fees or adjustments
   - Invoices are generated for the seller (MPL)
   - Receipts are created for the investor
   - Fund transfers are initiated through the banking system

6. **Reconciliation**:
   - Transaction completion is verified
   - Any discrepancies are identified and resolved
   - Final documentation is stored and linked to the loan records

## 3. Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Provides the backend services and API endpoints that handle loan purchase transactions, validation logic, and financial operations.

- [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md): Contains the contract definitions and data transfer objects used across the system for loan purchase operations.

- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Defines the database schema, relationships, and persistence layer for storing loan purchase data, batches, and financial transactions.

- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): Implements the frontend interfaces for initiating manual purchases, reviewing batches, approving transactions, and generating reports.

## 4. Key APIs

- `GET /selling/api/loans/HFS/*`: Retrieves loans held for sale that are eligible for purchase
- `GET /selling/api/loans/{id}`: Fetches detailed information about a specific loan
- `POST /selling/api/batches`: Creates a new batch of loans for purchase
- `PUT /selling/api/batches/{id}/validate`: Triggers validation of a loan batch
- `PUT /selling/api/batches/{id}/approve`: Approves a batch for purchase
- `GET /selling/api/batches/{id}/discrepancies`: Retrieves validation discrepancies for review
- `POST /selling/api/purchases/execute`: Executes the purchase transaction for approved batches
- `GET /selling/api/purchases/{id}/settlement`: Retrieves settlement details for a purchase

## 5. Data Entities

- [Loan](../data-model/entities.md#loan): Represents the core loan asset being purchased
- [Batch](../data-model/entities.md#batch): Groups loans together for bulk processing and purchase
- [BatchInfo](../data-model/entities.md#batchinfo): Contains metadata about a purchase batch
- [Contract](../data-model/entities.md#contract): Defines the terms and conditions for loan purchases
- [Invoice](../data-model/entities.md#invoice): Documents the financial details of the sale for the MPL
- [Receipt](../data-model/entities.md#receipt): Documents the financial details of the purchase for the investor
- [Discrepancy](../data-model/entities.md#discrepancy): Records validation issues that need resolution
- [Transfer](../data-model/entities.md#transfer): Tracks the financial movements between accounts
- [PurchaseAccount](../data-model/entities.md#purchaseaccount): Represents the financial accounts used in transactions
- [Investor](../data-model/entities.md#investor): Entity purchasing the loans
- [Mpl](../data-model/entities.md#mpl): Marketplace Lender selling the loans

The Loan Purchase and Funding feature acts as the transaction backbone of the COS Lending Selling platform, enabling the fluid movement of loan assets while maintaining compliance, accuracy, and transparency throughout the process.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:16:55.146Z*