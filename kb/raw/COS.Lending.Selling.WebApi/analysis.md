# COS.Lending.Selling.WebApi

## Purpose
COS Lending Selling WebApi is a .NET-based platform for managing loans in the marketplace lending ecosystem. It enables purchasing, changing, and managing loans, with features for calculating fees, handling transfers between accounts, and generating reports for various stakeholders.

## Business Features
- Loan purchase and sales management
- Loan type changes and grooming
- Fee calculation and collection (volume fees, Florida stamp tax, DMV fees, etc.)
- Interest accrual and processing
- Batch loan processing
- Transfers between accounts
- Investor reporting (pre-sale and post-sale)
- Reconciliation services
- Auto-purchase of eligible loans
- Monthly minimum fee calculation
- Transfer monitoring and status synchronization

## APIs
- **GET /api/loans** — Retrieve loans with various filter options
- **POST /api/loans/purchase** — Purchase loans from MPLs
- **POST /api/loans/discrepancies** — Find discrepancies between loan data
- **GET /api/contracts** — Retrieve lending contracts
- **POST /api/reports** — Generate loan sales reports
- **POST /api/grooming** — Change loan properties or investor

## Dependencies
- **COS** (http)
- **LendingContracts** (http)
- **LendingAccounting** (http)
- **Hooks** (http)
- **Storage** (http)
- **AWS SQS** (messaging)
- **PostgreSQL** (database)

## Data Entities
- **Loan** — Core loan entity with all related details and status
- **LoanAction** — Actions performed on loans like purchases and fee collections
- **Transfer** — Money movement between accounts
- **Contract** — Agreement between MPL and bank defining fee structures and terms
- **Account** — Financial accounts used for transfers
- **Batch** — Group of loans processed together
- **GroomingProcess** — Workflow for changing loan properties
- **VolumeFee** — Fees charged based on loan volume
- **PendingApproval** — Changes awaiting approval

## Messaging Patterns
- **TransferOutbox** (outbox) — Ensures reliable processing of transfers between accounts
- **DailyInterestOutbox** (outbox) — Handles daily interest accrual messages
- **NotificationOutbox** (outbox) — Manages external notifications about system events
- **BatchInitOutbox** (outbox) — Triggers batch initialization for loan purchases
- **ReportingOutbox** (outbox) — Manages report generation requests
- **VolumeFeeOutbox** (outbox) — Processes volume fee calculations and transfers
- **TrueUpVolumeFeeOutbox** (outbox) — Handles volume fee adjustments
- **SQS Message Queue** (queue) — Processes outbox messages for reliable delivery

## External Integrations
- **COS (Core Banking System)** — bidirectional via REST
- **AWS S3** — bidirectional via REST
- **Hooks Notification Service** — downstream via REST
- **Lending Contracts Service** — upstream via REST
- **Lending Accounting Service** — upstream via REST

## Architecture Patterns
- Microservices
- Outbox Pattern
- Repository Pattern
- Background Services
- CQRS
- Event-driven architecture
- Tenant Isolation

## Tech Stack
- .NET 8
- F# (for business logic)
- C# (for infrastructure)
- PostgreSQL 16.2
- Entity Framework Core
- AWS SQS
- Docker
- Quartz.NET
- NServiceBus
- CSV Helper

## Findings
### [HIGH] Sensitive information in repository

**Category:** security  
**Files:** .devcontainer/assets/CosLending.pfx, .devcontainer/assets/nsbLicense.xml

Certificate files (CosLending.pfx) and license files (nsbLicense.xml) are committed in the repository. These should be stored securely in a vault and retrieved during deployment rather than being committed to source control.
### [HIGH] Hardcoded credentials in docker-compose file

**Category:** architecture  
**Files:** .devcontainer/docker-compose.yml

The docker-compose.yml file contains hardcoded database credentials. These should be externalized to environment variables or a secure configuration store to prevent credential leakage.
### [HIGH] Missing authorization checks

**Category:** security  
**Files:** CRB.Cos.Lending.Selling.Middlewares/PolicyTenantService.cs

PolicyTenantService sets tenants but doesn't validate if the user has the necessary permissions for specific operations. Consider implementing more granular permission checks based on operation types.
