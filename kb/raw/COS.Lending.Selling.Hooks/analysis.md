# COS.Lending.Selling.Hooks

## Purpose
This repository implements a hooks service for the CRB's COS Lending Selling system, providing event notification capabilities. It serves as an integration point that receives notification events about loan sales and related activities and publishes them to a messaging system for downstream consumers.

## Business Features
- Loan sale status change notifications
- Batch purchase completion reporting
- True-up volume fee charge reporting
- Investor change notifications
- Loan type change notifications
- Overdue loans alerts

## APIs
- **GET /selling/hooks/health** — Health check endpoint for service monitoring
- **POST /selling/hooks/api/sendNotification** — Receives notification payloads and publishes them as events to the messaging system

## Dependencies
- **CRB.CosLending.Hooks.Hub.Service** (messaging)
- **CRB.Framework.Logging** (shared-lib)
- **CRB.Hooks** (shared-lib)
- **CRB.Nsb.Conventions** (shared-lib)
- **CRB.Authorization** (shared-lib)
- **CRB.CosLending.Common.Messages** (shared-lib)
- **NServiceBus** (shared-lib)

## Data Entities
- **LoanSaleStatusChanged** — Represents a change in loan sale status with loan details and financial information
- **BatchPurchaseCompleted** — Represents a completed batch purchase with financial details and number of loans
- **TrueUpVolumeFeeCharged** — Represents volume fee adjustments charged for a specific period
- **InvestorChanged** — Represents a change in investor assignment for a loan
- **LoanTypeChanged** — Represents a change in loan type classification
- **OverdueLoansAlert** — Contains summary information about overdue loans

## Messaging Patterns
- **LoanSaleStatusUpdated** (event) — Event published when a loan sale status changes
- **BatchPurchaseCompleted** (event) — Event published when a batch purchase is completed
- **TrueUpVolumeFeeCharged** (event) — Event published when volume fees are adjusted/charged
- **LoanTypeChanged** (event) — Event published when a loan's type is changed
- **InvestorChanged** (event) — Event published when a loan's investor is changed
- **OverdueLoansAlert** (event) — Event published to alert about overdue loans

## External Integrations
- **NServiceBus** — downstream via messaging
- **Identity Provider (oauth)** — upstream via REST

## Architecture Patterns
- Event-driven architecture
- Publish-subscribe pattern
- Microservice architecture
- API Gateway
- Hook pattern

## Tech Stack
- .NET Core 8
- NServiceBus
- Docker
- OAuth/OpenID Connect
- Swagger
- ASP.NET Core

## Findings
### [HIGH] OAuth/Authentication configuration exists but requires secure management

**Category:** security  
**Files:** src/CRB.Cos.Lending.Selling.Hooks.Host/appsettings.Development.json

The application uses OAuth for authorization with configuration stored in appsettings files. For production environments, ensure all secrets like connection strings and OAuth credentials are properly stored in secure secret management solutions like AWS Secrets Manager as mentioned in comments.
### [HIGH] Event schema changes may break subscribers

**Category:** architecture  
**Files:** src/CRB.Cos.Lending.Selling.Hooks.Host/NotificationPublisher.cs

The service publishes strongly-typed events to NServiceBus, but there's no versioning strategy evident in the code. Changes to event schemas could break downstream subscribers. Consider implementing event versioning and compatibility strategy.
