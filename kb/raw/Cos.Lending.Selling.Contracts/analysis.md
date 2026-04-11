# Cos.Lending.Selling.Contracts

## Purpose
This repository provides contract definitions for a loan selling system within a financial institution. It defines data structures and types for managing loan purchases, transfers, discrepancies, and related financial processes between different entities in a lending ecosystem.

## Business Features
- Loan purchase management
- Interest and fee calculation
- Batch processing of loans
- Discrepancy identification and reporting
- Invoice and receipt generation
- Reverse interest processing
- Purchase date updates
- Interest suspension management
- Transfer management

## Dependencies
- **CRB.Cos.Lending.Origination** (shared-lib)
- **CRB.Cos.Lending.Accounting** (shared-lib)

## Data Entities
- **Loan** — Represents a loan in the selling system with details about origination, sale status, amounts, and investor information
- **PagedLoanItem** — Simplified representation of a loan for listing and pagination purposes
- **Invoice** — Represents a purchase invoice containing loans to be purchased and associated fees
- **Receipt** — Records the results of a loan purchase process including successful and failed purchases
- **Investor** — Entity that purchases loans from the originator
- **Bank** — Financial institution involved in the loan process as issuer or servicer
- **Mpl** — Marketplace lender entity in the loan ecosystem
- **Discrepancy** — Represents differences between expected and actual loan data
- **BatchInfo** — Tracking information for batch processes with status counts and timing
- **PurchaseAccount** — Account used for loan purchase transactions
- **SofrRate** — Secured Overnight Financing Rate data used for interest calculations

## Messaging Patterns
- **LoanBatchPurchaseRequest** (event) — Request to process a batch of loans for purchase with specified parameters
- **PurchaseDateUpdateBatchRequest** (event) — Request to update purchase dates for a batch of loans

## External Integrations
- **Loan Origination System** — upstream via shared contract
- **Accounting System** — downstream via shared contract

## Architecture Patterns
- Domain-Driven Design
- Contract-first design
- Batch processing
- Event-driven architecture

## Tech Stack
- F#
- .NET
- Azure DevOps

## Findings
### [HIGH] PII data marked but not secured

**Category:** security  
**Files:** CRB.Cos.Lending.Selling.Contracts/Attributes/PIIDataAttribute.fs, CRB.Cos.Lending.Selling.Contracts/Loan.fs

PIIDataAttribute is defined but there's no evidence of encryption or special handling of PII-marked properties. The borrower's SSN, address, DOB, and other personal information should have additional protection mechanisms.
### [HIGH] Missing validation attributes on critical financial fields

**Category:** architecture  
**Files:** CRB.Cos.Lending.Selling.Contracts/Loan.fs, CRB.Cos.Lending.Selling.Contracts/InvoiceAndReceipt.fs

Financial values like loan amounts, interest rates, and fees lack validation attributes to ensure they're within acceptable ranges. This could allow invalid data to be processed, potentially causing financial discrepancies.
