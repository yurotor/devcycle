# Volume Fee Collection and True-Up

## Overview

The Volume Fee Collection and True-Up feature handles the assessment, collection, and reconciliation of volume-based fees from Marketplace Lenders (MPLs) according to their contractual terms. This feature ensures that the platform generates appropriate revenue based on loan volume while enforcing minimum fee thresholds through a monthly reconciliation process.

Key capabilities include:
- Calculating transaction fees based on loan volume
- Tracking fee accruals against contractual minimums
- Performing monthly true-up assessments to identify shortfalls
- Generating supplementary charges when actual fees fall below minimums

This feature is essential for maintaining the platform's revenue model and ensuring compliance with MPL contracts.

## How It Works

The Volume Fee Collection and True-Up process follows a multi-step workflow:

1. **Daily Fee Calculation**
   - Each loan transaction is evaluated based on the MPL's contract terms
   - Volume-based fees are calculated using the appropriate fee structure (percentage of principal, flat fee, tiered, etc.)
   - Fee transactions are created and associated with the corresponding loans and MPL accounts

2. **Fee Accumulation**
   - Throughout the month, transaction fees are accumulated in the system
   - Running totals are maintained per MPL to track progress toward minimum thresholds

3. **Monthly True-Up Process**
   - At month-end, an automated workflow compares the total collected fees against the minimum fee threshold for each MPL
   - If actual fees < minimum threshold, a true-up calculation determines the shortfall amount
   - A supplementary fee transaction is generated to cover the difference

4. **Reporting and Notification**
   - The system generates reports detailing fee calculations and true-up amounts
   - MPLs receive notifications regarding fee assessments and true-up charges

5. **Settlement**
   - Fee transactions are incorporated into the regular settlement process
   - Funds are transferred according to the established payment terms

The entire process is orchestrated through Airflow DAGs that schedule and coordinate these activities.

## Repos Involved

The Volume Fee Collection and True-Up functionality is implemented across multiple repositories:

- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the data models for fees, contracts, MPLs, and transactions
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow workflows that orchestrate the fee calculation, collection, and true-up processes
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Exposes endpoints for fee management and reporting

## Key APIs

The feature primarily operates through automated workflows, but several API endpoints support manual operations and reporting:

- `GET /api/fees/summary` - Retrieves fee summaries by MPL and date range
- `GET /api/fees/true-up/status` - Shows true-up status for the current month
- `POST /api/fees/manual-adjustment` - Allows manual fee adjustments when necessary
- `GET /api/reports/fees` - Generates detailed fee reports

## Data Entities

The following entities are central to the Volume Fee Collection and True-Up feature:

- [Fee](../data-model/fee.md): Represents individual fee transactions
- [Contract](../data-model/contract.md): Contains fee structures and minimum thresholds
- [Mpl](../data-model/mpl.md): Represents marketplace lenders subject to fees
- [Transfer](../data-model/transfer.md): Handles the monetary movement for fee settlements
- [Batch](../data-model/batch.md): Groups related fee transactions for processing
- [LoanAccount](../data-model/loan-account.md): Associates loans with accounts for fee calculations

The fee calculation logic references loan data to determine appropriate fee amounts based on transaction volume and contract terms.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:56:35.991Z*