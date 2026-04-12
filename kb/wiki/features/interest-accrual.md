# Interest Accrual Feature

## Overview
The Interest Accrual feature automates the calculation and application of daily interest on loans managed within the Cross River Bank's Loan Selling and Servicing Platform. This critical functionality ensures accurate and timely interest computation based on current SOFR (Secured Overnight Financing Rate) rates and the specific terms defined in loan contracts. The feature exists to maintain the financial accuracy of loan balances, support proper accounting, and provide transparency to both marketplace lenders (MPLs) and investors on interest accrued on their loan portfolios.

## How It Works
Interest accrual follows a systematic daily workflow:

1. **Rate Ingestion**: The system ingests daily SOFR rates from the Federal Reserve through the ingestion service.

2. **Workflow Triggering**: An Airflow DAG scheduled to run daily triggers the interest calculation job.

3. **Interest Calculation**: The WebApi calculates interest for each active loan using the following formula:
   ```
   Daily Interest = Outstanding Principal * (Contract Rate / 365)
   ```
   Where the Contract Rate may include SOFR plus a margin as defined in the loan contract.

4. **Processing Queue**: The calculated interest amounts are placed in the DailyInterestOutbox queue to ensure reliable processing.

5. **Accounting Integration**: Successfully calculated interest is posted to the accounting system to update loan balances.

6. **History Recording**: All interest calculations are recorded in the InterestHistory table for audit and reporting purposes.

The system handles edge cases such as loans paid off mid-day, newly originated loans, and interest rate changes seamlessly through its rule-based logic.

## Repos Involved
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Implements the core interest calculation logic and exposes APIs for retrieving interest history.
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow DAG that orchestrates the daily interest accrual workflow.
- [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md): Manages the ingestion of SOFR rates from the Federal Reserve.
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the data models for interest-related entities and handles database operations.

## Key APIs
- `GET /api/loans/{id}/interest`: Retrieves interest history for a specific loan
- `GET /api/loans/{id}/interest/summary`: Provides a summary of interest accrued for a loan over a specified time period
- Internal APIs for the interest calculation service (not externally exposed)

## Data Entities
- [Loan](../data-model/entities.md): Contains the loan data including principal balance used for interest calculations
- [Contract](../data-model/entities.md): Defines the interest terms including rate structure and calculation method
- [Account](../data-model/entities.md): Represents the financial accounts where interest is applied
- [InterestHistory](../data-model/entities.md): Records all interest calculations for audit and reporting purposes
- [LoanAction](../data-model/entities.md): Records actions taken on loans, including interest accrual events

The interest accrual feature is designed to be highly reliable with built-in reconciliation processes to ensure no interest calculations are missed or duplicated, even in the event of system failures or restarts.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T12:36:17.527Z*