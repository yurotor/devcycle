# Event Notifications and Hooks

## 1. Overview

The Event Notifications and Hooks feature provides a standardized mechanism for publishing and consuming notifications about significant loan-related events within the COS Lending Selling platform. This feature serves as a critical integration point that enables real-time communication between system components and with external systems.

Key business events that trigger notifications include:
- Loan status changes
- Batch purchase completions
- Fee charges (such as TrueUp Volume Fees)
- Investor assignment changes
- Loan type modifications
- Overdue loan alerts

This notification system allows downstream systems to react to these events in near real-time without tight coupling, enabling a more maintainable and scalable architecture.

## 2. How It Works

The notification flow follows these steps:

1. **Event Generation**: Business events are triggered within the system (e.g., when a loan status changes or a batch completes)
2. **Event Publishing**: The relevant service captures the event and publishes it to the COS.Lending.Selling.Hooks service
3. **Standardization**: The Hooks service transforms domain-specific events into standardized notifications
4. **Distribution**: Notifications are published to the CosLending Hooks Hub, a central distribution point
5. **Consumption**: Subscribing services consume relevant notifications based on event type

The system uses an asynchronous publish-subscribe pattern to decouple event producers from consumers, allowing for independent scaling and evolution of components.

## 3. Repos Involved

- [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) - Implements the hooks service that standardizes and publishes notifications
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Generates domain events based on business operations
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Provides the data entities that are referenced in notifications

## 4. Key APIs

The main endpoint for manual notification sending:
- `POST /selling/hooks/api/sendNotification` - Accepts a notification payload and publishes it to the Hooks Hub

Health check endpoint:
- `GET /selling/hooks/health` - Returns the health status of the hooks service

## 5. Data Entities

The notification system processes events related to these key entities:

- [Loan](../data-model/loan.md) - Core entity for loan status changes and type modifications
- [Batch](../data-model/batch.md) - Related to batch purchase completion events
- [Fee](../data-model/fee.md) - Associated with fee charge notifications (e.g., TrueUp Volume Fees)
- [Investor](../data-model/investor.md) - Referenced in investor change notifications
- [LoanEvent](../data-model/loan-event.md) - Records events related to loans including status changes

The system supports notification types including:
- LoanSaleStatusChanged
- BatchPurchaseCompleted
- TrueUpVolumeFeeCharged
- InvestorChanged
- LoanTypeChanged
- OverdueLoansAlert

Each notification follows a standardized schema to ensure consistent handling by consumers while containing entity-specific information relevant to the event type.

---

> **Repos:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:19:25.805Z*