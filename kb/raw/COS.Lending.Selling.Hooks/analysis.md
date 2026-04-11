# COS.Lending.Selling.Hooks

## Purpose
COS.Lending.Selling.Hooks is a service that acts as a notification gateway for loan-selling related events in the CRB Cos Lending platform. It receives notifications about loan sale status changes, batch purchases, and other lending events, and publishes them to a central hooks system to trigger downstream processes.

## Business Features
- Loan sale status change notifications
- Batch purchase completion notifications
- True-up volume fee charge notifications
- Loan type change notifications
- Investor change notifications
- Overdue loans alert notifications

## APIs
- **GET /selling/hooks/health** — Health check endpoint for the service
- **POST /selling/hooks/api/sendNotification** — Publishes various types of loan selling notifications to the hooks system

## Dependencies
- **CRB.CosLending.Hooks.Hub.Service** (messaging)
- **NServiceBus** (messaging)
- **CRB OAuth Service** (http)

## Data Entities
- **LoanSaleStatusChanged** — Represents a change in loan sale status with loan details, investor, and financial amounts
- **BatchPurchaseCompleted** — Represents a completed batch purchase with totals for principal, interest, fees and count of loans
- **TrueUpVolumeFeeCharged** — Represents a true-up volume fee charged for a specific month and year
- **InvestorChanged** — Represents a change in the investor associated with a loan
- **LoanTypeChanged** — Represents a change in the loan type for a specific loan
- **OverdueLoansAlert** — Represents alerts for overdue loans with counts and sum amounts

## Messaging Patterns
- **LoanSaleStatusUpdated** (event) — Event published when a loan sale status changes
- **BatchPurchaseCompleted** (event) — Event published when a batch purchase is completed
- **TrueUpVolumeFeeCharged** (event) — Event published when a true-up volume fee is charged
- **LoanTypeChanged** (event) — Event published when a loan type is changed
- **InvestorChanged** (event) — Event published when an investor is changed for a loan
- **OverdueLoansAlert** (event) — Event published when overdue loans are detected

## External Integrations
- **CosLending.Hooks.Hub** — downstream via messaging

## Architecture Patterns
- Event-driven architecture
- Notification pattern
- Publisher-subscriber pattern
- API Gateway

## Tech Stack
- .NET 8
- ASP.NET Core
- NServiceBus
- Docker
- Swagger
- OAuth/JWT Authentication

## Findings
### [HIGH] Missing error handling for failed event publishing

**Category:** architecture  
**Files:** src/CRB.Cos.Lending.Selling.Hooks.Host/NotificationPublisher.cs

The NotificationPublisher class does not have robust error handling for failures when publishing events. If the NServiceBus message publishing fails, there's no retry mechanism or error tracking, which could lead to lost notifications. Implement proper error handling with retries and dead-letter queue mechanism.
### [HIGH] Authentication configuration needs safeguards

**Category:** security  
**Files:** src/CRB.Cos.Lending.Selling.Hooks.Host/appsettings.Development.json

The authentication configuration in appsettings.Development.json indicates that OAuth keys are 'taken from aws secrets manager' but there's no validation to ensure these values are actually present before the application starts, which could lead to unauthenticated access if misconfigured.
