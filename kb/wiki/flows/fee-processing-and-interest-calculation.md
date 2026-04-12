# Fee Processing and Interest Calculation

The Fee Processing and Interest Calculation flow manages the complete lifecycle of fee assessment, interest accrual, and processing of financial charges for loans in the lending platform. It begins with daily/monthly fee evaluations based on contract terms, calculates interest based on loan balances and applicable rates, and processes these charges through accounting systems for collection from loan accounts.

This flow encompasses both scheduled automated processes via Airflow DAGs and on-demand API-triggered operations. It includes volume fee calculations, true-up processes for minimum fees, and daily interest accruals based on current SOFR rates. The system generates outbox messages for downstream processing, records transaction history, and ensures proper accounting entries for all financial activities.

## Steps

1. 1: System evaluates active loans/accounts to identify those eligible for fee assessment based on contract terms, loan status, and timing rules
2. 2: For applicable fees, the system calculates fee amounts using predefined fee structures, loan balances, and contract parameters
3. 3: Daily interest is calculated on outstanding loan balances using current interest rates (SOFR plus any spread)
4. 4: Volume fees are calculated based on loan volumes, applying tiering rules and monthly minimum requirements
5. 5: Fee and interest transactions are created and persisted to the database via the DbModel
6. 6: Outbox messages (FeeOutbox, DailyInterestOutbox, VolumeFeeOutbox, TrueUpVolumeFeeOutbox) are generated for processing
7. 7: Airflow DAGs process these outbox entries to update accounting records and trigger notifications
8. 8: System performs periodic true-up calculations to ensure minimum fee requirements are met based on contract terms
9. 9: Reporting data is extracted and made available for financial reconciliation and business analytics

## Repos Involved

[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)

## Data Entities

[Fee](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Loan](../data-model/entities.md), [Account](../data-model/entities.md), [Contract](../data-model/entities.md), [Batch](../data-model/entities.md), [VolumeFeeMonthlyMinimum](../data-model/entities.md), [MPL](../data-model/entities.md)

## External Systems

- Lending Accounting Service
- Cross River Bank COS
- SOFR data source

## Open Questions

- The specific contract terms that determine fee eligibility and calculation methods aren't clearly defined
- The exact business rules for fee waivers or special handling for certain loan types or customer segments
- The reconciliation process when fee calculation disputes occur between the bank and MPLs
- How retroactive rate changes affect previously calculated interest amounts

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T14:23:22.318Z*