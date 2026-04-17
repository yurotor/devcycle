# Event Notification & Outbox Processing

The Event Notification & Outbox Processing flow implements a reliable messaging pattern within the Cos.Lending.Selling system. When business events occur in the WebApi, they are first persisted in outbox tables in the database to ensure durability. These events are then processed asynchronously by outbox processors that publish them to the appropriate downstream systems. For domain events requiring notifications, the Hooks service receives these events and transforms them into standardized notifications delivered to subscribers via the Hooks Hub Service. This transactional outbox pattern ensures that data changes and message publishing are eventually consistent even if immediate publishing fails.

The flow spans multiple repositories with the WebApi initiating business transactions, the DbModel storing outbox records, and the Hooks service handling delivery of notifications to external consumers. Various outbox processors handle different event types including transfers, fees, batch initialization, interest calculations, and regulatory reporting. This architecture allows the system to maintain reliable, asynchronous communication while preserving transactional integrity.

## Steps

1. 1: Business operation triggers domain event in WebApi (e.g., loan sale status change, batch purchase completion)
2. 2: Transaction commits business data changes and writes event to appropriate outbox table in DbModel (e.g., NotificationOutbox, TransferOutbox)
3. 3: Outbox processor service periodically polls outbox tables for unprocessed records
4. 4: Processor reads outbox records, publishes messages to appropriate destinations, and marks records as processed
5. 5: For notification events, COS.Lending.Selling.Hooks service receives the event data
6. 6: Hooks service transforms domain event into standardized notification format
7. 7: Hooks service publishes notification to CRB.CosLending.Hooks.Hub.Service
8. 8: External subscribers receive notifications via Hooks Hub Service

## Repos Involved

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)

## Data Entities

[NotificationOutbox](../data-model/entities.md), [TransferOutbox](../data-model/entities.md), [FeeOutbox](../data-model/entities.md), [BatchInitOutbox](../data-model/entities.md), [DailyInterestOutbox](../data-model/entities.md), [VolumeFeeOutbox](../data-model/entities.md), [ReportingOutbox](../data-model/entities.md), [MaturedLoanOutbox](../data-model/entities.md), [TrueUpVolumeFeeOutbox](../data-model/entities.md), [LoanSaleStatusChanged](../data-model/entities.md), [BatchPurchaseCompleted](../data-model/entities.md), [TrueUpVolumeFeeCharged](../data-model/entities.md), [InvestorChanged](../data-model/entities.md), [LoanTypeChanged](../data-model/entities.md), [OverdueLoansAlert](../data-model/entities.md)

## External Systems

- CosLending Hooks Hub
- CRB.CosLending.Hooks.Hub.Service
- OAuth Identity Provider
- COS Storage Service
- COS Transaction Service
- Lending Contracts Service
- Lending Accounting Service

## Open Questions

- MessageDispatcherService in COS.Lending.Selling.WebApi has unclear relationship with the outbox processors
- The specific retry policies and error handling for outbox processors in COS.Lending.Selling.WebApi are not defined
- The exact mapping between outbox record types in Cos.Lending.Selling.DbModel and the event types handled by COS.Lending.Selling.Hooks is not clearly defined

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-16T12:55:41.325Z*