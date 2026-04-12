# Integration and Notifications

## Shared Entities

- **LoanSaleStatusChanged** — Represents loan sale status changes that are captured and published as notifications ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **BatchPurchaseCompleted** — Represents completed batch purchases with financial summaries that are published to notification subscribers ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **TrueUpVolumeFeeCharged** — Represents fee charges that are published as notifications for accounting and reconciliation purposes ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **InvestorChanged** — Represents investor reassignments that are published to notification subscribers ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **LoanTypeChanged** — Represents loan type modifications that are published to notification subscribers ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **OverdueLoansAlert** — Represents alerts about overdue loans that are published to notification subscribers ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))

## Data Flows

### Loan Selling Event Notification Flow

Captures loan selling domain events and distributes them to subscribers via the Hooks Hub

  1. Domain event occurs in COS.Lending.Selling domain
  2. Event is captured by COS.Lending.Selling.Hooks service
  3. Service transforms event into standardized notification format
  4. Notification is published to CosLending Hooks Hub via NServiceBus
  5. Subscribers receive notifications from the Hooks Hub

## Integration Points

- **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** → **[CosLending Hooks Hub](../repos/coslending-hooks-hub.md)** via messaging: Publishes standardized loan selling notifications that can be consumed by subscribers of the Hooks Hub
- **[OAuth Identity Provider](../repos/oauth-identity-provider.md)** → **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** via REST: Authenticates requests to the hooks service to ensure secure publishing of notifications

## Patterns

- **Webhook Publisher** — Implements a hooks pattern where domain events are converted to standardized notifications that can be subscribed to by other systems ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **Event-Driven Architecture** — Uses events to decouple the loan selling domain from consumers interested in loan selling activities ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **Message-Based Integration** — Uses NServiceBus for reliable message-based integration with the Hooks Hub ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))

## Open Questions

- How subscribers register their interest in specific notification types
- The exact business rules that trigger each type of notification
- Whether notifications include historical data or just current state changes
- How failed notification deliveries are handled and retried
- The complete set of external systems consuming these notifications

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-12T14:23:22.320Z*