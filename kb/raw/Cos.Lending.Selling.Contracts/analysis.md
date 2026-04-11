# Cos.Lending.Selling.Contracts

## Purpose
This repository defines contract models for a lending and loan selling system, serving as a shared library of data structures used for communication between different services in the CRB (Credit Review Board) ecosystem. It defines the domain entities, request/response objects, and data transfer objects for the loan selling lifecycle.

## Business Features
- Loan account management
- Batch loan purchasing and processing
- Purchase date updates
- Loan discrepancy detection
- Loan grooming and transfer operations
- Invoice generation and receipt processing
- Interest suspension and reversal
- SOFR rate handling

## Dependencies
- **Cos.Lending.Origination** (shared-lib)
- **Cos.Lending.Core** (shared-lib)

## Data Entities
- **Loan** — Core entity representing a loan with its associated properties, statuses, and financial data
- **PurchaseAccount** — Account used for loan purchasing operations
- **Invoice** — Request to purchase loans with associated details and fee structures
- **Receipt** — Record of completed loan purchase transactions including success and failure details
- **Batch** — Collection of loans processed together with metadata and processing status
- **Discrepancy** — Differences found between loan data in different systems
- **SofrRate** — Secured Overnight Financing Rate used for interest calculations
- **PendingApproval** — Loan changes awaiting approval in the system

## Messaging Patterns
- **LoanPurchased** (event) — Event raised when a loan is successfully purchased
- **BatchProcessCompleted** (event) — Event raised when a batch of loans completes processing
- **PurchaseDateUpdated** (event) — Event raised when loan purchase dates are modified

## External Integrations
- **Loan Origination System** — upstream via messaging
- **Account Management System** — bidirectional via messaging
- **COS Transfer System** — bidirectional via messaging

## Architecture Patterns
- Contract-first design
- Shared domain model
- Event-driven architecture
- Batch processing

## Tech Stack
- F#
- .NET Core
- NuGet

## Findings
### [HIGH] PII data marked but not protected

**Category:** security  
**Files:** CRB.Cos.Lending.Selling.Contracts/Attributes/PIIDataAttribute.fs, CRB.Cos.Lending.Selling.Contracts/Loan.fs

The code uses a PIIDataAttribute to mark PII data but there's no evidence of encryption or protection mechanisms for this data. Sensitive borrower information like SSNs and addresses should be properly protected with encryption.
### [HIGH] Missing validation in contract models

**Category:** architecture  
**Files:** CRB.Cos.Lending.Selling.Contracts/Loan.fs, CRB.Cos.Lending.Selling.Contracts/InvoiceAndReceipt.fs

The contract models don't implement validation logic which could lead to invalid data being processed. Consider adding data validation attributes or validation methods to ensure data integrity.
