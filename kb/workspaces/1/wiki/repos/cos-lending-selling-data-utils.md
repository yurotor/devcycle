# cos-lending-selling-data-utils

## Purpose

This repository contains utilities for resolving and mapping accounts for loans in a lending and selling system. It queries account information from multiple sources (accounting system, loan operations database) and updates the selling database with the proper account mappings needed for financial operations.

## Communicates With

[CRB.CosLending.Accounting.Api](../repos/crb-coslending-accounting-api.md), [MPLConsumerLoansOperations Database](../repos/mplconsumerloansoperations-database.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [OAuth Identity Provider](../repos/oauth-identity-provider.md)

## Features Implemented

- [Account Resolution and Mapping](../features/account-resolution-and-mapping.md)

## Business Features

- Account resolution for loans (purchase, return, interest, fee accounts)
- Custom purchase account mapping based on loan details
- Fee sweep account resolution
- Loan Source (LS) account mapping
- Account cleanup and management

## APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/Accounting/v1/LoanAccounting/LoanActionsAccounts` | Retrieves account information for a given loan from the COS Lending Accounting service |

## Dependencies

- **CRB.CosLending.Accounting.Api** (http)
- **MPLConsumerLoansOperations** (database)
- **SellingDB** (database)
- **CRB.Framework.Logging** (shared-lib)
- **CRB.Authorization** (shared-lib)

## Data Entities

- **Loan** — Core loan entity containing loan details needed for account resolution
- **LoanAccount** — Maps a loan to its associated accounts with specific purposes/objectives
- **ObjectiveAccount** — Account with a specific purpose such as purchase, return, interest income, etc.
- **FeeSweep** — Configuration for fee sweeping operations between accounts
- **CustomPurchaseAccountMapping** — Rules for mapping specific loans to custom purchase accounts based on loan details

> See also: [Data Model](../data-model/entities.md)

## External Integrations

- **CRB.CosLending.Accounting.Api** — upstream via REST
- **OAuth Authorization Server** — upstream via REST

> See also: [Integrations Overview](../integrations/overview.md)

## Architecture Patterns

- Microservice
- Repository Pattern
- Command Line Tool
- Bulk Data Processing

## Tech Stack

- .NET 7
- Entity Framework Core
- PostgreSQL
- SQL Server
- Docker
- Azure DevOps

## Findings

### [HIGH] Exposed Database Credentials

**Category:** security  
**Files:** accounts-resolver/appsettings.json

Database credentials and connection strings are stored in appsettings.json in plaintext. These should be moved to a secure secret store or environment variables, especially since these appear to be real development/QA servers.
### [HIGH] Hardcoded OAuth Client Credentials

**Category:** security  
**Files:** accounts-resolver/appsettings.json, accounts-resolver/appsettings.Development.json

OAuth client credentials are configured in appsettings files rather than being injected through a secure mechanism like Azure Key Vault or environment variables.
### [HIGH] Inefficient Batch Processing with Large Memory Usage

**Category:** architecture  
**Files:** accounts-resolver/AccountsResolver/AccountsProcessor.cs, accounts-resolver/Handlers/LoansAccountsService.cs

The application loads large amounts of loan data into memory when processing batches. This can lead to memory issues with large datasets. Consider implementing a streaming approach or pagination when processing large datasets.

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-16T13:01:33.726Z*