# Account Resolution and Mapping

## 1. Overview

Account Resolution and Mapping is a critical feature that enables proper financial accounting for loans in the Cross River Bank Operating System (COS) Lending Selling platform. This feature ensures that each loan has the appropriate account configurations required for all downstream financial operations, including loan purchases, funding, interest accruals, and fee collections.

The feature resolves account mappings by integrating data from the COS Lending Accounting service and the loan operations database. This resolution process is a necessary precursor to the Loan Purchase and Funding Flow, establishing the financial account structure that subsequent transactions will leverage.

## 2. How It Works

The Account Resolution and Mapping process follows these steps:

1. **Initial Request**: The process begins when a loan requires account mapping, typically before purchase or funding operations.

2. **Data Collection**: The system queries two primary sources:
   - COS Lending Accounting service - provides standardized accounting information
   - Loan operations database - contains specific loan details and configurations

3. **Mapping Resolution**: Using configuration rules and the collected data, the system determines which objective accounts should be mapped to specific loan accounts.

4. **Account Validation**: The system validates that all required accounts for the loan type and investor requirements are properly configured.

5. **Database Update**: Once resolved, the account mapping data is stored in the [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) database, primarily in the [LoanAccount](../data-model/entities.md) entities.

6. **Notification**: The system signals completion, allowing downstream processes like loan purchasing to proceed.

Custom account mapping rules can be applied for specific investors or MPLs through [CustomPurchaseAccountMapping](../data-model/entities.md) configurations.

## 3. Repos Involved

The Account Resolution and Mapping feature is implemented across several repositories:

- [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) - Contains the core utilities and logic for account resolution, including service calls to accounting systems and transformation logic
  
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Exposes endpoints that trigger account mapping operations and provides APIs to retrieve mapping information

- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Defines the data entities that store the resolved account mappings and provides persistence capabilities

## 4. Key APIs

The primary API used for account resolution is:

- `POST /Accounting/v1/LoanAccounting/LoanActionsAccounts` - Retrieves accounting information for loan actions including required account configurations

Additional supporting APIs may be present in the WebApi repository, though they're not explicitly defined in the provided documentation.

## 5. Data Entities

The Account Resolution and Mapping feature involves several key entities:

- [Loan](../data-model/entities.md) - The core entity that requires account mapping
- [LoanAccount](../data-model/entities.md) - Maps a loan to specific financial accounts
- [Account](../data-model/entities.md) - Represents financial accounts in the system
- [ObjectiveAccount](../data-model/entities.md) - Represents the purpose or objective of specific accounts
- [FeeSweep](../data-model/entities.md) - Configuration for fee collection related to accounts
- [CustomPurchaseAccountMapping](../data-model/entities.md) - Defines special account mapping rules for specific purchase scenarios

These entities collectively define how money moves within the system for each loan, establishing the financial structure that enables all downstream operations.

---

> **Repos:** [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:20:25.004Z*