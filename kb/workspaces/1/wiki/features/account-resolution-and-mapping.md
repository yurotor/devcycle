# Account Resolution and Mapping

## Overview

The Account Resolution and Mapping feature is a critical component of the COS Lending Selling platform that ensures loans are properly associated with the correct financial accounts. This feature resolves and maps loan accounts to appropriate financial account structures based on loan details, MPL (Marketplace Lender) configurations, and contract terms.

Key capabilities include:
- Determining the correct account mappings for loan purchases and sales
- Supporting custom purchase account mappings for special scenarios
- Configuring fee sweep operations for proper financial routing
- Ensuring financial transactions hit the right accounts for accounting accuracy

This feature is essential for maintaining financial integrity across the loan lifecycle, supporting regulatory compliance, and enabling proper financial reporting.

## How It Works

The account resolution process follows these steps:

1. **Initial Trigger**: During loan purchase processing, the system needs to determine the proper accounts for recording the transaction.

2. **Data Collection**: The system gathers data from multiple sources:
   - Loan details (amount, terms, product type)
   - MPL configurations (account structures, preferences)
   - Contract terms (investor requirements, special handling)
   - Custom mapping configurations (if applicable)

3. **Resolution Logic**: 
   - The system queries the accounting system and loan operations database
   - It applies business rules to determine the appropriate account mappings
   - For standard loans, it uses default account structures
   - For special cases, it applies custom purchase account mappings

4. **Fee Sweep Configuration**:
   - Based on the resolved accounts, fee sweep configurations are established
   - This determines how fees will be collected and routed

5. **Persistence**: The resolved account mappings are stored in the selling database, linked to the loan records

This process is part of the broader "Loan Purchase End-to-End Flow" and ensures that all financial aspects of loan transactions are properly accounted for.

## Repos Involved

- [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md): Contains the core utilities for account resolution and mapping, including query logic for multiple data sources and mapping algorithms
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the database models and context that store the resolved account mappings and related entities

## Key APIs

- `POST /Accounting/v1/LoanAccounting/LoanActionsAccounts`: The primary endpoint that handles account resolution requests, taking loan details as input and returning the resolved account mappings

## Data Entities

The following entities are central to the Account Resolution and Mapping feature:

- [Loan](../data-model/entities.md#loan): Contains the core loan details needed for account resolution
- [LoanAccount](../data-model/entities.md#loanaccount): Represents the mapping between a loan and its associated accounts
- [ObjectiveAccount](../data-model/entities.md#objectiveaccount): Defines the purpose-specific accounts used in financial operations
- [FeeSweep](../data-model/entities.md#feesweep): Configures how fees are collected and routed between accounts
- [CustomPurchaseAccountMapping](../data-model/entities.md#custompurchaseaccountmapping): Defines special account mappings for non-standard purchase scenarios
- [Account](../data-model/entities.md#account): Represents the financial accounts in the system
- [Mpl](../data-model/entities.md#mpl): Contains marketplace lender configurations that influence account mapping
- [Contract](../data-model/entities.md#contract): Contains terms that may affect account mappings

The Account Resolution and Mapping feature ensures all financial transactions are properly recorded and tracked throughout the loan lifecycle, providing accurate financial data for both operational and reporting purposes.

---

> **Repos:** [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:59:50.790Z*