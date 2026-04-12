# Cos.Lending.Selling.Contracts

## Purpose
This repository defines data contracts for a loan selling and management system in the lending domain. It contains type definitions for loan entities, purchase processes, interest calculations, and account management, serving as a shared contract library between different services.

## Business Features
- Loan selling and purchasing between financial institutions
- Loan account management
- Batch loan processing
- Purchase date management
- Interest and fee calculations
- Loan discrepancy detection
- Loan seasoning and investor allocation

## Dependencies
- **loan-origination-service** (shared-lib)
- **lending-service** (shared-lib)
- **investor-management-system** (shared-lib)

## Data Entities
- **Loan** — Represents a loan with its various attributes like ID, number, status, amount, interest rate, etc.
- **PurchaseAccount** — Represents an account that can purchase loans
- **BatchInfo** — Metadata about a batch operation, including progress statistics
- **Invoice** — Represents a loan purchase invoice with details about loans to be purchased
- **Receipt** — Receipt of a completed purchase transaction with success/failure details
- **Discrepancy** — Represents differences found between loan and reference data
- **SofrRate** — Secured Overnight Financing Rate used for interest calculations
- **Investor** — Entity that purchases loans
- **Mpl** — Marketplace lender entity
- **Bank** — Financial institution issuing or servicing loans

## Architecture Patterns
- Contract-first design
- Domain-driven design
- Shared library pattern

## Tech Stack
- F#
- .NET
- Azure DevOps
