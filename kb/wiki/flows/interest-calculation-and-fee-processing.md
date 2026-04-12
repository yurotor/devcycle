# Interest Calculation and Fee Processing

The Interest Calculation and Fee Processing flow manages the complete lifecycle of interest accrual and fee assessment for loans in the marketplace lending platform. The process begins with daily interest calculation on outstanding loan balances, applying appropriate rates (including SOFR adjustments), followed by systematic fee generation based on contract terms. Once calculated, the system processes the financial transactions, updates accounting ledgers, and distributes portions to appropriate stakeholders according to investment agreements and MPL contracts.

## Steps

1. 1: Daily interest accrual triggered by scheduled DAG jobs that calculate interest based on outstanding loan balances and applicable rates
2. 2: SOFR rate data ingestion from external sources to ensure accurate variable interest rate calculations
3. 3: Account resolution to identify appropriate interest and fee accounts for each loan using cos-lending-selling-data-utils
4. 4: Interest calculation performed using business rules defined in COS.Lending.Selling.WebApi
5. 5: Interest history records created and stored in Cos.Lending.Selling.DbModel
6. 6: Fee assessment based on contract terms, loan status, and time periods
7. 7: Fee and interest outbox messages created for downstream processing
8. 8: Volume fee calculations and true-ups performed for MPLs based on contractual minimums
9. 9: Financial transaction processing through the accounting system
10. 10: Reporting data exports generated for stakeholder visibility

## Repos Involved

[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)

## Data Entities

[Loan](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Fee](../data-model/entities.md), [LoanAccount](../data-model/entities.md), [Account](../data-model/entities.md), [Batch](../data-model/entities.md), [Mpl](../data-model/entities.md), [Contract](../data-model/entities.md), [VolumeFeeMonthlyMinimum](../data-model/entities.md), [ObjectiveAccount](../data-model/entities.md), [FeeSweep](../data-model/entities.md)

## External Systems

- CRB.CosLending.Accounting.Api
- SOFR data source
- Vampire
- Lending Accounting Service

## Open Questions

- The exact formula for interest calculation on different loan types is not clearly defined in Cos.Lending.Selling.DbModel
- The specific SOFR rate source integration details are not defined in cos-lending-selling-dags
- The fee allocation rules between different stakeholders are not explicitly defined in COS.Lending.Selling.WebApi
- The retry mechanism for failed interest calculations is not specified in any repository

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T12:35:48.598Z*