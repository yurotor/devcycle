# Interest Accrual and Pass-Through

## Overview

The Interest Accrual and Pass-Through feature automates the daily calculation, allocation, and accounting of interest on loans within the COS Lending Selling Platform. This feature ensures accurate interest tracking for both simple and SOFR-based rates while properly distributing interest income to appropriate stakeholders, including investors. The feature exists to:

- Ensure accurate interest calculations across the loan portfolio
- Enable pass-through interest allocation to investors based on their participation agreements
- Generate correct accounting entries for interest income and expense
- Support regulatory compliance with proper interest tracking

## How It Works

The Interest Accrual process follows a daily automated workflow:

1. **Interest Calculation Trigger**
   - An Airflow DAG initiates daily interest calculation at a scheduled time
   - The system identifies all active loans requiring interest accrual

2. **Rate Determination**
   - For fixed-rate loans, the system applies the contractual interest rate
   - For variable-rate loans, the system retrieves the current SOFR rate and applies spread adjustments

3. **Accrual Calculation**
   - Interest is calculated using the formula: Principal Balance × (Rate ÷ 365) × Days
   - For simple interest: calculated based on outstanding principal
   - For compound interest: calculated on principal plus previously accrued interest

4. **Pass-Through Allocation**
   - The system determines investor participation percentages from contracts
   - Interest is allocated proportionally to each investor based on ownership stakes
   - The platform owner retains any spread defined in participation agreements

5. **Accounting Entry Generation**
   - Debit entries created for interest receivable
   - Credit entries generated for interest income
   - Investor pass-through interest recorded as expense

6. **Data Persistence**
   - All interest accruals are recorded in the [InterestHistory](../data-model/entities.md) entity
   - Daily summaries are aggregated for reporting purposes

## Repos Involved

The Interest Accrual and Pass-Through feature is implemented across two primary repositories:

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Contains the core business logic for interest calculations, investor allocations, and API endpoints for retrieving interest data
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Houses the Airflow DAGs that orchestrate the daily interest accrual process, ensuring timely execution and error handling

## Key APIs

The following API endpoints are involved in the interest accrual process:

- `GET /api/loans/{id}/interest`: Retrieves interest history for a specific loan
- `GET /api/loans/{id}/interest/current`: Gets the current interest rate for a loan
- `GET /api/loans/{id}/allocations`: Retrieves investor interest allocations for a loan
- `POST /api/reports/interest`: Generates interest accrual reports for specified date ranges

## Data Entities

The feature relies on several key data entities:

- [Loan](../data-model/entities.md): Contains loan terms, balances, and interest rate information
- [InterestHistory](../data-model/entities.md): Records daily interest accruals with timestamps
- [Contract](../data-model/entities.md): Defines investor participation agreements and interest pass-through rules
- [Account](../data-model/entities.md): Tracks financial positions including interest receivables/payables
- [LoanAction](../data-model/entities.md): Records interest-related events in the loan lifecycle
- [Organization](../data-model/entities.md): Contains MPL and investor information for interest allocation

This feature forms the backbone of the financial calculations in the platform, ensuring accurate interest tracking and investor returns while maintaining proper accounting records for all stakeholders.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:24:15.797Z*