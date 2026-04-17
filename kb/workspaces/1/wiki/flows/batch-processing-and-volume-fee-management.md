# Batch Processing and Volume Fee Management

The Batch Processing and Volume Fee Management flow orchestrates the aggregated processing of loans in batches and manages volume-based fee calculations. It begins with batch initialization, where loans are selected for processing based on predefined criteria. Loans are processed in batches to optimize throughput, calculate volume fees, and apply any true-up fees to ensure minimum revenue requirements are met. The system then dispatches notifications about batch completion and volume fee charges to downstream systems.

Volume fees are calculated based on loan volumes and contractual terms with MPLs (Marketplace Lenders). The system maintains monthly minimum requirements, applies actual volume-based charges, and performs true-up calculations to reconcile any differences. Airflow DAGs orchestrate these workflows, handling the scheduling of batch processes and coordinating the data transformations necessary for accurate fee calculations and reporting.

## Steps

1. 1: Batch initialization - System identifies eligible loans and creates a batch for processing based on configurable criteria
2. 2: Loan processing - Batch processes selected loans applying relevant business rules and status transitions
3. 3: Volume fee calculation - System calculates fees based on processed loan volumes according to MPL contracts
4. 4: Monthly minimum fee verification - Compares actual volume fees against contractual monthly minimums
5. 5: True-up fee processing - When actual fees are below monthly minimums, calculates and applies true-up charges
6. 6: Notification dispatch - Sends BatchPurchaseCompleted and TrueUpVolumeFeeCharged notifications via hooks
7. 7: Reporting - Generates reports on processed batches and fee calculations for reconciliation and auditing

## Repos Involved

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)

## Data Entities

[Batch](../data-model/entities.md), [Loan](../data-model/entities.md), [Account](../data-model/entities.md), [VolumeFeeMonthlyMinimum](../data-model/entities.md), [Fee](../data-model/entities.md), [Mpl](../data-model/entities.md), [Contract](../data-model/entities.md), [BatchPurchaseCompleted](../data-model/entities.md), [TrueUpVolumeFeeCharged](../data-model/entities.md), [BatchInitOutbox](../data-model/entities.md), [VolumeFeeOutbox](../data-model/entities.md), [TrueUpVolumeFeeOutbox](../data-model/entities.md)

## External Systems

- CosLending Hooks Hub
- Cross River Bank COS
- Lending Accounting Service

## Open Questions

- The specific contractual terms that determine volume fee calculations and monthly minimums
- The exact triggering conditions for batch processing initiation
- The reconciliation process when fee calculation discrepancies occur
- How volume fee true-up charges are communicated to MPLs beyond system notifications

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-16T12:55:41.324Z*