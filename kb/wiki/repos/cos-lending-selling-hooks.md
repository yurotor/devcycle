# COS.Lending.Selling.Hooks

## Purpose

This repository implements a hooks service for the CRB.Cos.Lending.Selling domain that publishes notifications about loan selling-related events. It acts as an integration point that converts domain events into standardized notifications that can be consumed by other systems via a hooks pattern.

## Communicates With

[CRB.CosLending.Hooks.Hub.Service](../repos/crb-coslending-hooks-hub-service.md), [OAuth Identity Provider](../repos/oauth-identity-provider.md)

## Features Implemented

- [Real-Time Event Notifications](../features/real-time-event-notifications.md)

## Business Features

- Loan sale status notifications
- Batch purchase completion notifications
- True-up volume fee charge notifications
- Investor change notifications
- Loan type change notifications
- Overdue loans alert notifications

## APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/selling/hooks/health` | Health check endpoint for the service |
| POST | `/selling/hooks/api/sendNotification` | Publishes loan selling-related notifications to the hooks system |

## Dependencies

- **CRB.CosLending.Hooks.Hub.Service** (messaging)
- **NServiceBus** (messaging)
- **CRB.Authorization** (shared-lib)
- **CRB.Framework.Logging** (shared-lib)
- **CRB.Hooks** (shared-lib)
- **CRB.Nsb.Conventions** (shared-lib)

## Data Entities

- **LoanSaleStatusChanged** — Represents a change in loan sale status with associated loan details
- **BatchPurchaseCompleted** — Represents completed batch purchase of loans with financial summaries
- **TrueUpVolumeFeeCharged** — Represents a true-up volume fee charged for a specific month and year
- **InvestorChanged** — Represents a change in the investor associated with a loan
- **LoanTypeChanged** — Represents a change in loan type for a specific loan
- **OverdueLoansAlert** — Represents an alert about overdue loans with summary statistics

> See also: [Data Model](../data-model/entities.md)

## Messaging Patterns

- **LoanSaleStatusChanged** (event) — Publishes event when loan sale status changes
- **BatchPurchaseCompleted** (event) — Publishes event when batch purchase of loans completes
- **TrueUpVolumeFeeCharged** (event) — Publishes event when true-up volume fee is charged
- **InvestorChanged** (event) — Publishes event when investor is changed for a loan
- **LoanTypeChanged** (event) — Publishes event when loan type is changed
- **OverdueLoansAlert** (event) — Publishes event for overdue loans alerts

## External Integrations

- **CosLending Hooks Hub** — downstream via messaging
- **OAuth Identity Provider** — upstream via REST

> See also: [Integrations Overview](../integrations/overview.md)

## Architecture Patterns

- Microservices
- Event-driven architecture
- Hooks pattern
- Publish-subscribe

## Tech Stack

- .NET 8
- ASP.NET Core
- NServiceBus
- Docker
- Swagger

## Findings

### [HIGH] Missing authentication on health check endpoint

**Category:** security  
**Files:** src/CRB.Cos.Lending.Selling.Hooks.Host/Program.cs

The health check endpoint '/selling/hooks/health' doesn't have authentication requirements, which could potentially leak system information. Consider securing this endpoint or limiting the information it returns.

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-12T14:26:15.921Z*