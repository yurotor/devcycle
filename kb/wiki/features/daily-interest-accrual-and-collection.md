# Daily Interest Accrual and Collection

## Overview

The Daily Interest Accrual and Collection feature automates the calculation, accrual, and collection of interest on sold loans within the COS Lending platform. This critical feature ensures that investors receive timely interest payments based on their loan holdings according to contractually defined terms. 

The feature serves multiple business purposes:
- Ensures accurate daily interest calculations based on contract terms
- Automates the transfer of interest from borrower accounts to investor accounts
- Supports various interest calculation methods and day count conventions
- Maintains a detailed audit trail of all interest transactions
- Enables accurate financial reporting and reconciliation

## How It Works

The Daily Interest Accrual Flow operates through an orchestrated sequence of operations:

1. **Loan Identification**: The system identifies all active loans eligible for interest accrual.

2. **Interest Calculation**:
   - For each loan, the system applies the contractually defined interest rate
   - Calculations respect the day count convention specified in the loan agreement (e.g., 30/360, Actual/365)
   - Interest is calculated on the remaining principal balance

3. **Accrual Processing**:
   - Interest amounts are accrued daily in the system
   - The accrued amounts are stored as pending transactions

4. **Collection and Distribution**:
   - At the collection interval (typically monthly), accrued interest is collected from loan accounts
   - The system applies the pass-through logic to distribute interest to the appropriate investor accounts
   - For loans with multiple investors, interest is proportionally distributed based on ownership percentages

5. **Transaction Recording**:
   - Each interest accrual and collection generates transaction records
   - All transactions are tracked in the `InterestHistory` entity
   - These records support financial reconciliation and audit requirements

The process runs automatically as a scheduled daily job through Airflow DAGs, with additional reconciliation processes to handle exceptions or failed transactions.

## Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Provides the API endpoints for interest calculations and manual operations
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) - Contains the Airflow DAGs that orchestrate the daily interest accrual process
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Defines the database schema for interest-related entities and relationships

## Key APIs

The following endpoints support interest accrual and collection:

1. **Interest Calculation API**
   - Calculates interest for a specific loan or set of loans
   - Supports various calculation methods and conventions

2. **Interest Accrual API**
   - Records daily interest accrual transactions
   - Updates pending interest totals

3. **Interest Collection API**
   - Initiates collection of accrued interest
   - Manages the distribution to investor accounts

4. **Interest History API**
   - Retrieves historical interest transactions
   - Supports reporting and reconciliation activities

## Data Entities

The following entities are core to the interest accrual and collection process:

- [Loan](../data-model/entities.md) - Contains the loan terms, including interest rate and payment schedule
- [Account](../data-model/entities.md) - Represents borrower and investor accounts where interest is debited and credited
- [Contract](../data-model/entities.md) - Defines the terms governing interest calculations and collections
- [InterestHistory](../data-model/entities.md) - Records all interest transactions for audit and reconciliation
- [Transfer](../data-model/entities.md) - Represents the movement of funds between accounts
- [LoanAccount](../data-model/entities.md) - Links loans to their associated accounts
- [Investor](../data-model/entities.md) - Entities receiving interest payments

The system maintains relationships between these entities to ensure proper interest flow from borrowers through the platform to investors, with complete traceability at each step.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:17:13.083Z*