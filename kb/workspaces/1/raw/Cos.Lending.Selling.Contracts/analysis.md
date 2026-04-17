# Cos.Lending.Selling.Contracts

## Purpose
To provide a shared contract library containing data models, DTOs, and request/response objects for loan selling operations between various microservices in a lending system.

## Business Features
- Loan purchase management
- Loan type classification (HFS, LTHFS, RET)
- Invoice and receipt generation for loan purchases
- Batch processing of loan operations
- Interest and principal transfer operations
- Loan seasoning management
- Data discrepancy identification and resolution
- Interest suspension handling
- Purchase date updates and management
- SOFR (Secured Overnight Financing Rate) rate tracking

## Dependencies
- **undefined** (undefined)

## Data Entities
- **Loan** — Core loan entity with status tracking, origination details, investor information, and purchase data
- **LoanInfo** — Comprehensive loan data including borrower details, loan terms, payment schedules, and financial metrics
- **Invoice** — Represents a purchase invoice for loans with detailed fee information
- **Receipt** — Documents successful and failed loan purchases from a batch operation
- **BatchInfo** — Tracks batch operation progress with success/failure statistics
- **PurchaseAccount** — Account details used for loan purchases
- **Discrepancy** — Tracks differences between loan data in different systems
- **SofrRate** — SOFR rate value for a specific date

## Messaging Patterns
- **Request/Response** (undefined) — Standardized request and response objects for operations like loan purchases, updates, and transfers
- **Batch Operations** (undefined) — Models supporting bulk operations on multiple loans with results tracking

## External Integrations
- **undefined** — undefined via undefined

## Architecture Patterns
- [object Object]
- [object Object]
- [object Object]

## Tech Stack
