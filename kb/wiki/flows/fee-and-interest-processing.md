# Fee and Interest Processing

The Fee and Interest Processing flow manages the full lifecycle of calculating, accruing, collecting, and reporting fees and interest for loans in the selling system. This process begins with data ingestion from multiple sources, including external rate information (like SOFR rates), loan details, and account mappings required for financial transactions.

The system then performs daily interest accrual calculations and schedules various fee assessments based on loan characteristics, investor agreements, and volume-based fee structures. These fees and interest charges are processed through appropriate accounts, which are resolved and mapped through the account resolution utilities. The entire flow culminates in financial reporting, notifications, and the execution of financial transactions to settle fees and interest across accounts.

## Steps

1. Data Ingestion: Ingest SOFR rates, loan data, account mappings, and fee schedules from external systems
2. Account Resolution: Map and resolve purchase, return, interest, and fee accounts for proper financial routing
3. Daily Interest Calculation: Calculate daily interest accruals for all active loans
4. Fee Assessment: Determine applicable fees including volume fees, true-up fees, and service fees based on business rules
5. Transaction Generation: Create financial transactions for interest charges and fees
6. Batch Processing: Group related transactions into batches for efficient processing
7. Financial Settlement: Execute the actual movement of funds between accounts
8. Notification: Publish events like TrueUpVolumeFeeCharged for downstream systems
9. Reporting: Generate fee and interest reports for accounting and compliance

## Repos Involved

[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)

## Data Entities

[Fee](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Account](../data-model/entities.md), [Loan](../data-model/entities.md), [LoanAccount](../data-model/entities.md), [Transfer](../data-model/entities.md), [Batch](../data-model/entities.md), [FeeOutbox](../data-model/entities.md), [DailyInterestOutbox](../data-model/entities.md), [VolumeFeeOutbox](../data-model/entities.md), [TrueUpVolumeFeeOutbox](../data-model/entities.md), [ObjectiveAccount](../data-model/entities.md), [FeeSweep](../data-model/entities.md)

## External Systems

- SOFR data source
- CRB.CosLending.Accounting.Api
- CosLending Hooks Hub
- MPLConsumerLoansOperations
- OAuth Identity Provider

## Open Questions

- The exact triggering mechanism for fee collection process (scheduled vs. event-driven)
- Detailed error handling and reconciliation process for failed fee transactions
- Specific rules for different fee types and their calculation formulas
- Integration with payment processing systems not clearly defined
- The process for fee adjustments or reversals is not explicitly documented

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T12:35:48.598Z*