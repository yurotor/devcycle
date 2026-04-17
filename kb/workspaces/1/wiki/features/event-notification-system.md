# Event Notification System

## Overview

The Event Notification System enables real-time propagation of significant domain events from the COS Lending Selling platform to external systems. This feature is critical for maintaining synchronization between the lending platform and downstream systems, enabling real-time reactions to loan lifecycle changes. The system follows a hooks pattern implemented via NServiceBus to publish notifications when significant events occur, such as loan status changes, batch completions, fee charges, or investor changes.

The notification system allows external systems to subscribe to specific events, ensuring they remain up-to-date with changes in the lending platform without requiring direct database access or tight coupling.

## How It Works

1. **Event Generation**: When a significant domain event occurs within the Lending Selling system (e.g., a loan status change), it triggers an event publication.

2. **Event Publishing**: The system converts domain events into standardized notification messages using NServiceBus.

3. **Message Routing**: NServiceBus handles the routing of these messages to subscribed systems based on message type.

4. **Delivery**: External systems receive the notifications via webhooks or message queue consumers.

5. **Data Flow**: The notification system is integrated into the Loan Purchase End-to-End Flow, ensuring all relevant systems are notified of changes throughout the loan lifecycle.

The system implements a reliable messaging pattern, ensuring that notifications are delivered at least once, even in the case of temporary system failures.

## Repos Involved

The primary implementation of the Event Notification System is in:

- [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md): Implements the hooks service that publishes notifications about loan selling-related events. This repo converts domain events into standardized notifications.

- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the data entities that are monitored for changes and generate domain events.

## Key APIs

The notification system exposes the following endpoints:

- `GET /selling/hooks/health`: Health check endpoint to verify the hooks service is operational
- `POST /selling/hooks/api/sendNotification`: Endpoint for manual notification sending (typically used for testing or retries)

## Data Entities

The Event Notification System monitors and publishes notifications for changes to the following entities:

- [Loan](../data-model/entities.md#loan): Notifies when loan status or type changes
- [Batch](../data-model/entities.md#batch): Publishes events when batch purchases complete
- [Fee](../data-model/entities.md#fee): Notifies when fees like TrueUpVolumeFee are charged
- [Investor](../data-model/entities.md#investor): Sends notifications when an investor is changed for a loan
- [LoanEvent](../data-model/entities.md#loanevent): Records all event notifications for audit purposes

The system handles the following specific event types:
- LoanSaleStatusChanged
- BatchPurchaseCompleted
- TrueUpVolumeFeeCharged
- InvestorChanged
- LoanTypeChanged
- OverdueLoansAlert

Each of these events corresponds to a specific domain event within the lending selling platform and triggers appropriate notifications to interested systems.

---

> **Repos:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:58:26.889Z*