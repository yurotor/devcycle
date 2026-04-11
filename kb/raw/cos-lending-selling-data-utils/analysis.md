# cos-lending-selling-data-utils

## Purpose
This repository provides a data utility tool for the COS Lending and Selling system that resolves and maps various account numbers for loans from different banking systems, primarily fetching account information from the Lending Accounting API and updating the Selling database with the appropriate account mappings.

## Business Features
- Loan accounts resolution and mapping
- Fee sweep account resolution
- Custom purchase account mapping
- Loan source (LS) account resolution
- Account data cleanup and validation

## APIs
- **POST /Accounting/v1/LoanAccounting/LoanActionsAccounts** — Fetches loan account information from the Lending Accounting API

## Dependencies
- **Crb.CosLending.Accounting.Api** (http)
- **CRB.Framework.Logging** (shared-lib)
- **CRB.Authorization** (shared-lib)
- **CRB.Cos.Lending.Selling.DbContext** (shared-lib)
- **SellingDB** (database)
- **MPLConsumerLoansOperationsProd** (database)

## Data Entities
- **Loan** — Represents a loan with essential information like ID, MPL ID, issuing bank, loan type, and origination status
- **LoanAccount** — Associates a loan with various account numbers for different purposes (purchase, income, etc.)
- **ObjectiveAccount** — An account with a specific business purpose like purchase, return, or interest income
- **FeeSweep** — Represents fee sweep information with source and destination accounts

## External Integrations
- **Lending Accounting API** — downstream via REST
- **MPL Consumer Loans Operations DB** — downstream via database
- **SellingDB** — bidirectional via database
- **OAuth Token Provider** — downstream via REST

## Architecture Patterns
- Batch processing
- Repository pattern
- Dependency injection
- Microservice
- Command line application

## Tech Stack
- .NET Core 7.0
- Entity Framework Core
- PostgreSQL
- SQL Server
- Npgsql.Bulk
- Docker
- Azure DevOps
- OAuth

## Findings
### [HIGH] Credentials in Configuration Files

**Category:** security  
**Files:** accounts-resolver/appsettings.json

The appsettings.json file contains database connection string information including username fields. Although the password fields appear to be empty in the checked-in files, this pattern suggests that actual passwords might be supplied in environment-specific configuration files. Credentials should be stored in a secure vault and accessed via a secret management service.
### [HIGH] Inefficient Batch Processing

**Category:** architecture  
**Files:** accounts-resolver/AccountsResolver/AccountsProcessor.cs, accounts-resolver/Handlers/LoansAccountsService.cs

The application loads all loans with missing accounts into memory before processing, which could cause memory issues with large datasets. Consider implementing a streaming approach with a cursor-based pagination to process loans in smaller batches while maintaining performance.
