# Volume Fee Calculation and True-Up

## 1. Overview

The Volume Fee Calculation and True-Up feature manages the financial obligations between Cross River Bank, Marketplace Lenders (MPLs), and investors based on contractually defined volume tiers. This system ensures:

- Accurate calculation of monthly fees based on loan volume tiers
- Enforcement of minimum commitment thresholds
- Periodic reconciliation (true-up) of contracted versus actual volumes
- Financial settlement of variances through either refunds or additional charges

This feature is critical for revenue management and maintaining contractual compliance with business partners in the loan marketplace ecosystem.

## 2. How It Works

### Volume Fee Calculation

1. **Contract Tier Analysis**: The system reads [Contract](../data-model/entities.md) records to identify applicable fee tiers for each MPL or Investor
2. **Volume Aggregation**: Monthly loan volumes are aggregated per partner from [Loan](../data-model/entities.md) and [Batch](../data-model/entities.md) data
3. **Tier Determination**: The system determines which tier applies based on actual volume
4. **Fee Calculation**: Fees are calculated by applying the tier's percentage or fixed amount to the total volume
5. **Minimum Threshold Check**: If volume is below contracted minimums, the minimum fee is applied instead

### True-Up Process

1. **Reconciliation Period**: Typically performed quarterly or annually as defined in contracts
2. **Historical Analysis**: Compares actual processed volumes against contracted minimums for the period
3. **Variance Calculation**: Determines if fees were under or overpaid based on tiered structure
4. **Settlement Generation**: Creates [Fee](../data-model/entities.md) records for either:
   - Additional fees owed (if volume was below minimum commitment)
   - Refunds due (if higher volumes achieved lower tier rates)
5. **Payment Processing**: Integrates with [Transfer](../data-model/entities.md) functionality to settle financial obligations

The process is orchestrated through scheduled Airflow DAGs that trigger the calculations and initiate the appropriate workflows.

## 3. Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Provides APIs for fee calculation, true-up execution, and reporting
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Contains the data models for contracts, fees, loans, and other entities used in calculations
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Implements the scheduled jobs that process volume calculations and true-up reconciliation

## 4. Key APIs

The primary endpoints supporting this feature include:

- `GET /api/fees/volume-calculation` - Returns current period fee calculation preview
- `POST /api/fees/calculate-volume` - Triggers manual volume fee calculation
- `GET /api/fees/true-up/summary` - Retrieves true-up reconciliation summary
- `POST /api/fees/true-up/execute` - Initiates true-up process for specified period
- `GET /api/contracts/tiers` - Retrieves contract tier information for a partner

## 5. Data Entities

The feature primarily interacts with these data entities:

- [Contract](../data-model/entities.md): Stores tiered fee structures and minimum commitment thresholds
- [Fee](../data-model/entities.md): Records calculated fees including volume-based and true-up adjustments
- [Loan](../data-model/entities.md): Provides actual volume data for calculations
- [Batch](../data-model/entities.md): Groups loans for volume aggregation
- [Transfer](../data-model/entities.md): Manages financial settlement of fees and adjustments
- [Mpl](../data-model/entities.md): Contains marketplace lender information subject to fee agreements
- [Investor](../data-model/entities.md): Contains investor information subject to fee agreements

This feature ensures accurate financial operations while maintaining compliance with complex contractual agreements through systematic calculation and reconciliation.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:17:54.726Z*