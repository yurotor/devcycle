# Invoice and Receipt Generation

## Overview

The Invoice and Receipt Generation feature provides automated documentation for loan purchase transactions within the COS Lending Selling platform. This feature produces two critical types of documentation:

1. **Invoices**: Detailed records of loan costs and associated fees during purchase operations
2. **Receipts**: Transaction records documenting both successful and failed loan purchase operations

This feature exists to ensure complete financial transparency, audit compliance, and transaction tracking within the loan marketplace ecosystem. It serves as the official record-keeping mechanism for all purchase transactions between marketplace lenders (MPLs), investors, and Cross River Bank.

## How It Works

The Invoice and Receipt Generation process operates within the Loan Purchase End-to-End Flow:

1. **Invoice Generation**:
   - When a loan purchase is initiated, the system calculates all associated costs including principal, interest, and applicable fees
   - Fees are calculated based on the appropriate interest accrual method (Standard, SOFR-based, or Combined)
   - The system generates a formal invoice document with line items for each cost component
   - For batch operations, invoices consolidate multiple loan costs into a single document

2. **Receipt Processing**:
   - Upon completion of purchase transactions (successful or failed), the system generates receipts
   - Successful transaction receipts include confirmation details, transaction IDs, and timestamps
   - Failed transaction receipts document error conditions, validation failures, and other issues
   - For batch operations, receipts document both successful and failed transactions within the batch

3. **Workflow Integration**:
   - Invoices are generated during the pre-purchase phase
   - Receipts are generated during the post-purchase phase
   - Both documents are linked to the relevant batch or individual loan records
   - Documents are made available through the API for retrieval by authorized systems

## Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Hosts the API endpoints that trigger invoice and receipt generation as part of the purchase workflow
- [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md): Contains the data models and DTOs for invoices and receipts, including response objects returned to API consumers

## Key APIs

While no specific API endpoints are directly documented for this feature, invoice and receipt generation is integrated into the loan purchase workflow APIs. The main endpoints that incorporate this functionality include:

- Batch Purchase Initiation endpoints
- Loan Purchase Confirmation endpoints
- Transaction Status endpoints

## Data Entities

The following entities are central to the Invoice and Receipt Generation process:

- [Loan](../data-model/entities.md#loan): The primary entity being purchased
- [LoanInfo](../data-model/entities.md#loaninfo): Contains detailed loan data needed for invoice calculations
- [Invoice](../data-model/entities.md#invoice): Represents the purchase invoice document
- [Receipt](../data-model/entities.md#receipt): Documents the transaction outcome
- [BatchInfo](../data-model/entities.md#batchinfo): Contains information about batch operations
- [PurchaseAccount](../data-model/entities.md#purchaseaccount): Represents the financial account associated with the transaction
- [Discrepancy](../data-model/entities.md#discrepancy): Records any inconsistencies found during the purchase process
- [SofrRate](../data-model/entities.md#sofrrate): Used for SOFR-based interest calculations on invoices

The invoice and receipt generation process integrates these entities to create comprehensive financial documentation that supports the loan purchase ecosystem.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T13:01:33.724Z*