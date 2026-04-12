# Fee Processing & Accounting

The Fee Processing & Accounting flow manages the entire lifecycle of fees in the lending and selling system, from calculation and assessment to collection and reconciliation. Fees are generated based on loan activities, volume commitments, and contractual agreements with MPLs (Marketplace Lenders). Once calculated, fees are swept from designated accounts, properly accounted for in the accounting system, and recorded for reporting purposes.

The process involves multiple systems working together to ensure accurate fee assessment, proper account resolution, timely collection, and transparent reporting. It handles various fee types including transaction fees, volume fees, true-up fees, and special adjustments based on contractual agreements. The flow ensures proper accounting entries are created in the general ledger while maintaining a detailed audit trail of all fee-related activities.

## Steps

1. Fee Calculation: Based on loan activities, contract terms, and volume commitments, the system calculates appropriate fees to be charged
2. Account Resolution: The data-utils service resolves the proper fee accounts for both source and destination of fee movements
3. Fee Assessment: Fees are assessed and recorded in the database with proper associations to loans, batches, or MPLs
4. Fee Collection/Sweep: Scheduled processes initiate the collection of fees from designated MPL accounts
5. Outbox Processing: Fee collection events are published via FeeOutbox pattern for downstream consumers
6. Accounting Entry Creation: Accounting entries are created in the general ledger reflecting fee collections
7. Volume Fee True-up: Monthly processing evaluates actual vs. committed volumes and calculates true-up fees when necessary
8. Reporting & Reconciliation: Fee data is exported to reporting systems for financial reporting and reconciliation purposes

## Repos Involved

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)

## Data Entities

[Fee](../data-model/entities.md), [Account](../data-model/entities.md), [Loan](../data-model/entities.md), [LoanAccount](../data-model/entities.md), [FeeSweep](../data-model/entities.md), [VolumeFeeMonthlyMinimum](../data-model/entities.md), [FeeOutbox](../data-model/entities.md), [VolumeFeeOutbox](../data-model/entities.md), [TrueUpVolumeFeeOutbox](../data-model/entities.md), [ObjectiveAccount](../data-model/entities.md), [CustomPurchaseAccountMapping](../data-model/entities.md)

## External Systems

- CRB.CosLending.Accounting.Api
- AWS SQS
- Lending Accounting Service

## Open Questions

- Exact formula and rules for different fee types calculation in COS.Lending.Selling.WebApi
- Mechanism for handling fee collection failures in Cos.Lending.Selling.DbModel outbox processors
- Specific timing and triggers for volume fee true-up calculations in cos-lending-selling-dags
- Reconciliation process between fees assessed and accounting entries in CRB.CosLending.Accounting.Api

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T12:35:48.598Z*