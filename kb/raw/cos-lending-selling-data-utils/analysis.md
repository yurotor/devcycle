# cos-lending-selling-data-utils

## Purpose
This repository contains a data utility service for the Cross-River Bank Lending & Selling platform that resolves and maps loan accounts between different systems. It retrieves loan account information from various sources, including a Lending Accounting API and MPL Consumer Loan Operations database, and updates the Selling database with the correct account mappings.

## Business Features
- Loan account resolution for loan selling operations
- Custom purchase account mapping based on loan attributes
- Fee sweep account resolution
- Integration with loan source (LS) accounts from MPL Consumer Loans Operations
- Account validation and cleanup

## APIs
- **POST /Accounting/v1/LoanAccounting/LoanActionsAccounts** — Retrieves loan account information from the CRB.CosLending.Accounting.Api

## Dependencies
- **CRB.CosLending.Accounting.Api** (http)
- **MPLConsumerLoansOperationsProd** (database)
- **sellingdb** (database)
- **CRB.Framework.Logging** (shared-lib)
- **CRB.Authorization** (shared-lib)

## Data Entities
- **Loan** — Represents a loan record with key attributes for account resolution
- **LoanAccount** — Represents an account associated with a loan and its objective type
- **FeeSweep** — Represents a fee sweep transaction with associated accounts
- **ObjectiveAccount** — Represents an account with a specific business purpose/objective within the system
- **LsAccount** — Represents a Loan Source account from the MPL Consumer system

## External Integrations
- **OAuth Service** — upstream via REST
- **CRB.CosLending.Accounting.Api** — upstream via REST
- **MPL Consumer Loan Operations DB** — upstream via SQL

## Architecture Patterns
- Command Line Application
- Repository Pattern
- Data Mapper Pattern
- Service Pattern
- Dependency Injection

## Tech Stack
- .NET 7.0
- C#
- Entity Framework Core
- PostgreSQL
- SQL Server
- Npgsql
- Docker
- Xunit
- Moq

## Findings
### [HIGH] Hardcoded Database Connection Strings

**Category:** security  
**Files:** accounts-resolver/appsettings.json

The appsettings.json file contains potentially sensitive database connection strings. While passwords appear to be placeholders, connection strings for production-like environments should not be committed to source control and should be managed through secure configuration or environment variables.
### [HIGH] Lack of Error Handling in Account Processing

**Category:** architecture  
**Files:** accounts-resolver/AccountsResolver/AccountsProcessor.cs, accounts-resolver/Handlers/LoansAccountsService.cs

In several places, bulk batch operations might fail but only log errors without proper retry mechanisms. For critical loan processing, there should be robust error handling and retry logic to ensure data integrity.
