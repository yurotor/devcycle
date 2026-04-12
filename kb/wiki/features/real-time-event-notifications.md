# Real-Time Event Notifications

## 1. Overview

The Real-Time Event Notifications feature provides a robust mechanism for publishing critical events that occur within the COS Lending Selling Platform. This feature enables downstream systems to integrate with and respond to important state changes in the loan management lifecycle without requiring direct database access or tight coupling.

Key events published include:
- Loan sale status changes
- Batch purchase completions
- Investor changes
- Loan type changes
- Fee charges
- Overdue loan alerts

This feature exists to maintain a clean separation of concerns between systems while enabling real-time reactions to important business events across the platform ecosystem.

## 2. How It Works

The notification system operates on a hooks pattern within the Loan Purchase Flow:

1. When a significant event occurs in the core selling platform (e.g., a loan sale status changes), the relevant service raises a domain event
2. The Hooks service captures these domain events
3. The service transforms domain-specific events into standardized notifications
4. Notifications are published to subscribed systems through designated endpoints
5. Downstream systems can then take appropriate actions based on these notifications

This asynchronous notification approach ensures that the core system remains focused on its primary responsibilities while still enabling rich integrations with other systems.

## 3. Repos Involved

- [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) - Implements the hooks service that transforms domain events into standardized notifications and publishes them to downstream systems
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Core backend that generates the domain events when significant state changes occur in the loan selling process

## 4. Key APIs

**COS.Lending.Selling.Hooks**
- `GET /selling/hooks/health` - Health check endpoint for the hooks service
- `POST /selling/hooks/api/sendNotification` - Endpoint for publishing notifications to subscribed systems

**COS.Lending.Selling.WebApi** (Event source)
- Various endpoints that generate domain events:
  - `GET /api/loans` - Loan management operations that may trigger status changes
  - `GET /api/loans/{id}` - Specific loan operations
  - `GET /api/batches` - Batch processing operations
  - `POST /api/transfers` - Loan transfer operations that may trigger investor changes

## 5. Data Entities

The notification system works with the following event entities:

- [LoanSaleStatusChanged](../data-model/entities.md) - Represents a change in a loan's sale status
- [BatchPurchaseCompleted](../data-model/entities.md) - Indicates completion of a batch purchase
- [TrueUpVolumeFeeCharged](../data-model/entities.md) - Indicates when volume fees are charged
- [InvestorChanged](../data-model/entities.md) - Represents changes to the investor associated with a loan
- [LoanTypeChanged](../data-model/entities.md) - Indicates a change in loan classification
- [OverdueLoansAlert](../data-model/entities.md) - Notification about loans that have become overdue

The service also interacts with core domain entities managed by the WebApi including:
- [Loan](../data-model/entities.md) - The core loan entity
- [Batch](../data-model/entities.md) - Represents a batch of loans being processed
- [Transfer](../data-model/entities.md) - Represents the transfer of a loan between parties

The hooks service plays a crucial role in maintaining system extensibility by providing a standardized way for state changes to be communicated across system boundaries in real-time.

---

> **Repos:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:25:13.338Z*