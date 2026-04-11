# cos-lending-selling-data-utils

## Purpose
COS.Lending.Selling.DataTools.AccountsResolver is a utility that resolves and manages accounts for loans in the CRB Lending Selling platform. It retrieves account information from multiple sources including the Lending Accounting API and LS database, then updates the Selling database with the correct account mappings for various financial operations.

## Business Features
- Account resolution for loans with missing account information
- Fee sweep account management
- Custom purchase account mapping
- Loan source account resolution
- Account validation and cleanup

## APIs
- **POST /Accounting/v1/LoanAccounting/LoanActionsAccounts** — Retrieve account information for loans from the CRB.CosLending.Accounting.Api

## Dependencies
- **CRB.CosLending.Accounting.Api** (http)
- **SellingDB** (database)
- **MPLConsumerLoansOperationsProd** (database)
- **CRB.Authorization** (shared-lib)
- **CRB.Framework.Logging** (shared-lib)

## Data Entities
- **Loan** — Represents loan data with identifiers, investor information, and loan status
- **LoanAccount** — Maps loans to their associated accounts with different objective types
- **ObjectiveAccount** — Account with a specific purpose (purchase, interest income, fee income, etc.)
- **FeeSweep** — Represents fee sweep transactions that require account resolution
- **CustomPurchaseAccountMapping** — Configuration for mapping specific loan attributes to custom purchase accounts

## External Integrations
- **Lending Accounting Service** — upstream via REST
- **OAuth Token Provider** — upstream via REST
- **MPL Consumer Loan Operations** — upstream via database

## Architecture Patterns
- Microservice
- Command-line utility
- Repository pattern
- Service pattern
- Dependency injection

## Tech Stack
- .NET 7
- Entity Framework Core
- PostgreSQL
- SQL Server
- Docker
- Azure DevOps pipelines
- CommandLine parser
- Npgsql.Bulk
- JSON

## Findings
### [HIGH] Hardcoded Database Connection Strings

**Category:** security  
**Files:** accounts-resolver/appsettings.json

The application contains hardcoded database connection strings in appsettings.json with empty password fields, which suggests passwords may be added at runtime. This poses a security risk as connection strings could be accidentally committed with credentials or leaked through logs.
### [HIGH] Missing error handling for OAuth token failures

**Category:** architecture  
**Files:** accounts-resolver/Infrastructure/Accounting/LendingAccountingClient.cs

The LendingAccountingClient depends on token-based authentication but lacks robust error handling for token acquisition failures, which could lead to unhandled exceptions and service outages in production.
