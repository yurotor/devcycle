# COS.Lending.Selling.Hooks

## Purpose
COS.Lending.Selling.Hooks provides a centralized notification service for loan selling operations in the COS Lending system. It processes various business events related to loan sales and investor activities, transforming them into standardized messages and publishing them to downstream systems through a hooks pattern.

## Business Features
- Loan sale status change notifications
- Batch purchase completion notifications
- True-up volume fee charge tracking
- Loan type change tracking
- Investor change notifications
- Overdue loans alerting

## APIs
- **GET /selling/hooks/health** — Health check endpoint for service monitoring
- **POST /selling/hooks/api/sendNotification** — Accepts various notification types and publishes them as standardized events

## Dependencies
- **CRB.CosLending.Hooks.Hub.Service** (messaging)
- **NServiceBus** (messaging)
- **CRB.Framework.Logging** (shared-lib)
- **CRB.Hooks** (shared-lib)
- **CRB.CosLending.Common.Messages** (shared-lib)
- **OAuth Authorization Server** (http)

## Data Entities
- **LoanSaleStatusChanged** — Represents a change in loan sale status including loan information and sale details
- **BatchPurchaseCompleted** — Represents a completed batch purchase transaction with financial details and metrics
- **TrueUpVolumeFeeCharged** — Represents volume fee adjustments charged to loans on a periodic basis
- **InvestorChanged** — Represents a change in the investor associated with a loan
- **LoanTypeChanged** — Represents a change in loan type classification
- **OverdueLoansAlert** — Represents metrics about overdue loans requiring attention

## Messaging Patterns
- **LoanSaleStatusUpdated** (event) — Published when a loan's sale status is updated
- **BatchPurchaseCompleted** (event) — Published when a batch purchase transaction is completed
- **TrueUpVolumeFeeCharged** (event) — Published when a true-up volume fee is charged
- **LoanTypeChanged** (event) — Published when a loan's type classification changes
- **InvestorChanged** (event) — Published when a loan's investor assignment changes
- **OverdueLoansAlert** (event) — Published when metrics about overdue loans need to be reported

## External Integrations
- **NServiceBus** — downstream via messaging
- **CRB.CosLending.Hooks.Hub.Service** — downstream via messaging
- **OAuth Authorization Server** — upstream via REST

## Architecture Patterns
- Microservice
- Event-driven architecture
- Publisher-subscriber pattern
- API Gateway
- Hooks pattern

## Tech Stack
- .NET 8
- ASP.NET Core
- NServiceBus
- Docker
- JWT Authentication
- Swagger

## Findings
### [HIGH] Sensitive configuration in appsettings files

**Category:** security  
**Files:** src/CRB.Cos.Lending.Selling.Hooks.Host/appsettings.Development.json

The application contains sensitive configuration information in appsettings files, with a note that TransportConnectionString is 'taken from aws secrets manager', but the code doesn't show proper secrets management implementation. This could lead to credential leakage. Implement proper secret management using AWS Secrets Manager or similar service.
### [HIGH] Lack of input validation

**Category:** architecture  
**Files:** src/CRB.Cos.Lending.Selling.Hooks.Host/NotificationPublisher.cs

The NotificationPublisher accepts notification objects without validating their content before publishing them as events. This could lead to data integrity issues or system errors downstream. Implement input validation for all notification types.
