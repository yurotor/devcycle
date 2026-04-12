# Account Resolution and Mapping

## 1. Overview

The Account Resolution and Mapping feature provides automated mapping of GL (General Ledger) accounts for various loan actions within the COS Lending Selling Platform. It ensures that financial transactions related to loans (purchases, returns, interest accruals, fees) are correctly posted to the appropriate accounting entries by resolving the correct GL accounts based on loan attributes and business rules.

This feature exists to:
- Automate the determination of correct accounting entries for loan transactions
- Ensure consistent accounting treatment across different loan types and actions
- Support compliance with accounting standards and regulatory requirements
- Enable accurate financial reporting and reconciliation

## 2. How It Works

The Account Resolution and Mapping process follows these steps:

1. **Trigger**: The process is triggered during loan actions (e.g., purchase flow, return, interest accrual, fee assessment)

2. **Data Collection**: The system gathers the required loan attributes and context information:
   - Loan details (product type, loan status, origination channel)
   - Action type being performed
   - MPL (Marketplace Lender) information
   - Current accounting configuration

3. **Account Resolution**:
   - The system queries the Accounting API with loan attributes
   - The Accounting API returns candidate accounts based on the action type
   - Custom mapping rules are applied to select the appropriate accounts based on:
     - Loan attributes
     - Action type
     - Business rules specific to the MPL

4. **Account Mapping**:
   - The resolved accounts are mapped to the specific loan action
   - Mappings are stored in the selling database for reference and audit purposes

5. **Account Application**:
   - The mapped accounts are used in subsequent financial transactions
   - Journal entries are created using these accounts

The feature handles special cases including:
- Custom account mappings for specific MPLs
- Fee sweep account determination
- Objective account mapping for specific loan products
- Default account fallbacks when specific mappings aren't found

## 3. Repos Involved

- [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md): Contains the core account resolution and mapping logic, including utilities for querying the Accounting API and applying custom mapping rules
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Consumes the account mapping functionality during loan purchase flows and other loan actions

## 4. Key APIs

- `POST /Accounting/v1/LoanAccounting/LoanActionsAccounts`: Queries the Accounting API to retrieve appropriate GL accounts based on loan attributes and action type
- `GET /api/loans`: Retrieves loan details needed for account resolution
- `GET /api/loans/{id}`: Gets specific loan information for account mapping
- `POST /api/transfers`: Creates transfers using the resolved accounts

## 5. Data Entities

The following entities are involved in the Account Resolution and Mapping feature:

- [Loan](../data-model/entities.md#loan): Contains the loan attributes used for determining appropriate accounts
- [LoanAccount](../data-model/entities.md#loanaccount): Represents the mapping between a loan and its associated GL accounts
- [ObjectiveAccount](../data-model/entities.md#objectiveaccount): Defines specialized accounts for specific objectives or purposes
- [FeeSweep](../data-model/entities.md#feesweep): Contains information about accounts used for fee sweeping operations
- [CustomPurchaseAccountMapping](../data-model/entities.md#custompurchaseaccountmapping): Stores custom account mappings for specific MPLs or loan products
- [LoanAction](../data-model/entities.md#loanaction): Represents actions performed on loans that require account resolution
- [Account](../data-model/entities.md#account): Represents GL accounts in the system

The Account Resolution and Mapping feature is a critical component that ensures financial transactions are properly recorded in the accounting system, maintaining the integrity of the financial data across the COS Lending Selling Platform.

---

> **Repos:** [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:26:15.920Z*