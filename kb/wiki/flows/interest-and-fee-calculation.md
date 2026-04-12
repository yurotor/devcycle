# Interest and Fee Calculation

The Interest and Fee Calculation flow manages the daily and monthly financial calculations for loans in the lending platform. It begins with daily interest accrual based on current loan balances and SOFR rates, followed by calculation of various fees based on contract terms. The process includes recording these calculations for accounting purposes and creating entries that will be used for investor payments and reporting.

The flow involves automated scheduled batch processes that run through Airflow DAGs to handle interest calculations, volume fee assessments, true-up calculations, and fee sweep operations. These calculations are essential for accurate financial reporting, investor payments, and revenue recognition across the loan portfolio.

## Steps

1. 1: SOFR Rate Ingestion - Import daily SOFR rates from external source into the system as the base for interest calculations
2. 2: Daily Interest Calculation - Calculate daily interest on each loan based on current balance, applicable rate and loan status
3. 3: Interest Accrual Recording - Record calculated interest in InterestHistory entity and prepare for accounting entries
4. 4: Fee Calculation - Calculate various fees (origination, servicing, etc.) based on contract terms and loan parameters
5. 5: Volume Fee Processing - Calculate volume-based fees according to MPL contracts and minimum volume commitments
6. 6: True-Up Calculation - Perform monthly true-up calculations to adjust for any discrepancies in volume fee calculations
7. 7: Fee Sweep Processing - Collect calculated fees from appropriate accounts as defined in account mappings
8. 8: Accounting Entry Generation - Create accounting entries for interest and fees in the Accounting Service
9. 9: Reporting Data Export - Generate reporting data for financial analysis and investor statements

## Repos Involved

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)

## Data Entities

[Loan](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Account](../data-model/entities.md), [Fee](../data-model/entities.md), [SofrRate](../data-model/entities.md), [LoanAction](../data-model/entities.md), [VolumeFeeMonthlyMinimum](../data-model/entities.md), [CustomPurchaseAccountMapping](../data-model/entities.md), [FeeSweep](../data-model/entities.md)

## External Systems

- COS.Lending.Accounting
- SOFR data source
- Cross River Bank COS

## Open Questions

- The specific calculation formula for volume fee true-ups in cos-lending-selling-dags is not clearly defined
- The exact rules for determining when to use CustomPurchaseAccountMapping in cos-lending-selling-data-utils are not specified
- The relationship between InterestHistory in COS.Lending.Selling.WebApi and the accounting entries created is not fully documented

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T14:23:22.318Z*