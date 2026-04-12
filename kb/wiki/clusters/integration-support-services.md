# Integration & Support Services

## Shared Entities

- **Loan** — Core loan entity containing identifier and sale status information. Flows from data-utils as source of truth to hooks for event publishing. ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))
- **Investor** — Entity representing the investor associated with loans. Data-utils resolves/updates this information while hooks service publishes changes via InvestorChanged events. ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))

## Data Flows

### Loan Sale Status Change Notification

When a loan's sale status changes, the change is captured and notifications are published to downstream systems

  1. Loan sale status change detected
  2. Account data resolved via data-utils
  3. Hooks service publishes LoanSaleStatusChanged event
  4. Notification sent to CosLending Hooks Hub
### Batch Purchase Accounting Flow

When batch purchases complete, account mapping occurs and notifications are sent

  1. Batch purchase completion detected
  2. data-utils resolves accounts from multiple sources
  3. Proper account mappings updated in SellingDB
  4. Hooks service publishes BatchPurchaseCompleted event

## Integration Points

- **[cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)** → **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** via shared-db: Loan account mappings are persisted to SellingDB by data-utils and then read by the hooks service to enrich event notifications with proper financial account information
- **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** → **[CRB.CosLending.Hooks.Hub.Service](../repos/crb-coslending-hooks-hub-service.md)** via messaging: Loan selling events (status changes, batch purchases, etc.) are published as standardized notifications via NServiceBus
- **[cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)** → **[CRB.CosLending.Accounting.Api](../repos/crb-coslending-accounting-api.md)** via REST: Retrieves loan accounting information needed to resolve the proper financial accounts for loans

## Patterns

- **Webhook Publisher** — Exposes an endpoint to receive domain events and transforms them into standardized notifications that are published to subscribers ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **Data Integration Hub** — Resolves and integrates account data from multiple sources (accounting API and databases) to create a unified view ([cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))
- **Event Notification** — Domain events are published as notifications to inform downstream systems of changes in loan selling status and operations ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))

## Open Questions

- How the TrueUpVolumeFeeCharged event in COS.Lending.Selling.Hooks gets the fee account information it needs to process charges
- Which system triggers the account resolution process in cos-lending-selling-data-utils before loan selling events occur
- How CustomPurchaseAccountMapping rules in cos-lending-selling-data-utils are maintained and by which system
- How the FeeSweep entity in cos-lending-selling-data-utils interacts with the hooks system for fee-related notifications

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-12T14:23:22.320Z*