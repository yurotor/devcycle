# Cos.Lending.Selling.Contracts

## Purpose



## Features Implemented

- [Loan Purchase and Funding](../features/loan-purchase-and-funding.md)
- [Loan Grooming (Investor and Type Changes)](../features/loan-grooming-investor-and-type-changes.md)

## Business Features

- Loan purchase and sale processing
- Invoice and receipt generation
- Loan interest management and reversal
- Loan batch processing
- Loan discrepancy management
- Loan type and investor management
- Grooming operations for loans

## Data Entities

- **Loan** — Core entity representing a loan with comprehensive information including borrower data, financial details, and loan status
- **PagedLoanItem** — Summary view of a loan used for listing and pagination purposes
- **BatchInfo** — Information about batch processing operations
- **Invoice** — Represents an invoice for loan purchases
- **Receipt** — Confirms completed loan purchase transactions
- **Discrepancy** — Tracks differences between loan values and reference values
- **PurchaseAccount** — Account information for loan purchases

> See also: [Data Model](../data-model/entities.md)

## Tech Stack


---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-13T06:20:47.565Z*