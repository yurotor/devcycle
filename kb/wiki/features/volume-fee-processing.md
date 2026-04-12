# Volume Fee Processing

## Overview
The Volume Fee Processing feature manages the calculation, tracking, and collection of volume-based fees from Marketplace Lenders (MPLs). It ensures that MPLs are correctly billed according to their contractual agreements, including monthly minimum fee requirements and true-up adjustments. This feature is essential for revenue management and ensuring compliance with financial agreements between the platform and its MPL partners.

The system handles two critical fee components:
1. Monthly minimum fee calculations - ensuring MPLs meet their minimum volume commitments
2. True-up adjustments - reconciling actual transaction volume with minimum commitments and collecting additional fees when needed

## How It Works

The Volume Fee Processing feature follows this operational flow:

1. **Monthly Fee Calculation Trigger**:
   - An Airflow DAG in the `cos-lending-selling-dags` repository triggers the volume fee calculation workflow at scheduled intervals (monthly).
   - The DAG initiates API calls to the WebApi service to start fee calculations.

2. **Fee Calculation**:
   - The WebApi service calculates fees against predefined monthly minimums for each MPL.
   - Calculations are processed via the `VolumeFeeOutbox` component which:
     - Retrieves actual transaction volumes for the month
     - Compares against the contractual minimum volume requirements
     - Calculates standard volume-based fees

3. **True-Up Processing**:
   - The `TrueUpVolumeFeeOutbox` component determines if additional charges are needed:
     - If an MPL's actual volume falls below their minimum commitment, a true-up fee is calculated
     - The true-up amount equals the difference between the minimum fee and the actual volume-based fees

4. **Fee Collection**:
   - Calculated fees are sent to the accounting system for collection
   - Fee records are stored in the database through the DbModel services

5. **Notification**:
   - After successful collection of true-up fees, the Hooks service publishes a `TrueUpVolumeFeeCharged` event
   - This event notifies relevant systems and stakeholders about the completed fee adjustments

## Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Handles the core fee calculation logic, implementing the volume fee and true-up fee outbox processors
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow DAGs that trigger the volume fee processing workflow on a scheduled basis
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the data entities and persistence layer for storing fee-related information
- [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md): Publishes events when true-up fees are charged, enabling integration with other systems

## Key APIs

- **Volume Fee Processing APIs**:
  - Volume fee calculation is triggered internally through the Airflow DAG system
  - No direct external API endpoints exist specifically for triggering volume fee processing

- **Related APIs**:
  - `GET /api/loans` - For retrieving loan data used in volume calculations
  - `GET /api/batches` - For analyzing batch information related to MPL activity
  - `POST /api/reports` - For generating reports on fee calculations and collections
  - `POST /selling/hooks/api/sendNotification` - Used to publish fee-related events

## Data Entities

Key entities involved in the Volume Fee Processing feature:

- [VolumeFeeMonthlyMinimum](../data-model/entities.md) - Stores the contractual monthly minimum fee requirements for each MPL
- [Fee](../data-model/entities.md) - Records individual fee transactions including volume fees and true-ups
- [MPL](../data-model/entities.md) - Contains information about Marketplace Lenders subject to volume fees
- [Account](../data-model/entities.md) - Tracks financial accounts associated with fee collections
- [Loan](../data-model/entities.md) - Used for volume calculations based on loan originations and sales
- [Batch](../data-model/entities.md) - Groups of loans processed together, used for volume tracking

The volume fee processing system ensures accurate revenue collection while maintaining compliance with MPL agreements. The automated nature of the system reduces manual intervention and ensures timely fee collection.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T12:36:35.028Z*