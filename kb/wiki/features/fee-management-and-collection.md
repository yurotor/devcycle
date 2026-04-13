# Fee Management and Collection

## Overview

The Fee Management and Collection feature handles the calculation, collection, tracking, and reconciliation of various loan-related fees within the COS Lending Selling platform. This feature is critical to the financial operations of Cross River Bank, ensuring proper revenue recognition and accounting for fees charged across the loan lifecycle.

The system manages several fee types:
- DMV Fees: Regulatory fees associated with vehicle loans
- Florida Stamp Tax: State-specific tax requirements for Florida loans
- Loan Payoff Shortfall: Fees to cover shortfalls in loan payoff amounts
- Merchant Fees: Fees charged to merchants participating in the platform
- Volume Fees: Fees based on loan volume transactions

This feature exists to automate fee operations, minimize manual intervention, ensure regulatory compliance, and provide transparent fee tracking for all parties.

## How It Works

The fee management process follows these key steps:

1. **Fee Definition**: Fees are configured in the system with calculation rules, collection schedules, and accounting treatments.

2. **Fee Calculation**:
   - Triggered automatically based on loan events (e.g., origination, sale)
   - Rules engine determines applicable fees based on loan characteristics
   - Volume fees are calculated based on aggregate transaction data

3. **Fee Collection**:
   - System generates fee collection entries
   - Fees are collected via ACH transfers from appropriate accounts
   - Collection is scheduled and batched for efficiency

4. **Fee Tracking**:
   - All fee transactions are recorded with detailed audit trails
   - Reconciliation processes ensure fees match expected amounts
   - Reporting provides visibility into fee revenue streams

5. **Data Flow**:
   - Fee calculation is triggered by loan events in the system
   - Fee objects are created in the database with status "Pending"
   - Airflow DAGs handle the collection process and update statuses
   - Completed collections update fee records to "Collected" status

## Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Provides API endpoints for fee management, calculation rules, and collection status
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Contains entity definitions for Fee structures and relationships
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Orchestrates fee collection workflows, batch processing, and scheduling

## Key APIs

The following endpoints manage fee operations:

- `POST /api/fees/calculate`: Calculates applicable fees for a specified loan or batch
- `GET /api/fees/{id}`: Retrieves detailed information about a specific fee
- `GET /api/fees/loan/{loanId}`: Lists all fees associated with a particular loan
- `POST /api/fees/collect`: Initiates the fee collection process for eligible fees
- `GET /api/fees/reports/summary`: Provides summary reports of collected and pending fees

## Data Entities

The fee management feature primarily works with these entities:

- [Fee](../data-model/fee.md): Core entity representing a fee instance with amount, type, status
- [Loan](../data-model/loan.md): Associated loan that triggered or is subject to the fee
- [Account](../data-model/account.md): Source and destination accounts for fee collection
- [Transfer](../data-model/transfer.md): Represents the movement of funds for fee collection
- [Batch](../data-model/batch.md): Groups fees for bulk processing
- [Mpl](../data-model/mpl.md): Marketplace lender entities subject to or receiving certain fees

The Fee entity maintains relationships with Loans, Accounts, and other entities to ensure proper tracking and attribution of all fee transactions throughout the system.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:17:31.126Z*