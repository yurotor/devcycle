# Architecture Patterns

Shared architectural patterns across the system.

## Outbox Pattern

Ensures reliable message delivery and eventual consistency for financial transactions. Multiple outbox tables (TransferOutbox, FeeOutbox, DailyInterestOutbox, VolumeFeeOutbox, TrueUpVolumeFeeOutbox, BatchInitOutbox, NotificationOutbox, MaturedLoanOutbox) persist domain events before they are dispatched via message bus, preventing data loss during failures.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
## Event-Driven Architecture

System uses NServiceBus and RabbitMQ for asynchronous communication. Domain events trigger notifications to downstream systems via the hooks service, enabling loose coupling between services.

**Used in:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
## Microservices Architecture

System is decomposed into multiple independent services: WebApi for business logic, Hooks for event notifications, UI for user interface, AI for natural language queries, with each having its own deployment and scaling characteristics.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
## Contract-First Design with Shared Library

Cos.Lending.Selling.Contracts provides immutable F# data models (DTOs) used across services to ensure consistent data structures and type safety in cross-service communication.

**Used in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
## Repository Pattern

Data access is abstracted through repository interfaces and Entity Framework Core, providing separation between business logic and persistence concerns.

**Used in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)
## Extract-Load-Transform (ELT)

Data is first extracted from source systems (Arix, Contracts DB, SOFR API, S3 servicing files) and loaded into the warehouse, then transformed using dbt for analytics and reporting.

**Used in:** [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
## Infrastructure as Code

All AWS infrastructure is defined and versioned using Terragrunt and Terraform, enabling reproducible deployments across environments with state isolation based on git branches.

**Used in:** [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)
## Multi-Tenant Architecture

System supports different tenant types (SellingITAdmin, InternalTenant, MplTenant, BankTenant, InvestorTenant) with role-based access control enforced at application level.

**Used in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
## Background Services for Continuous Processing

Multiple background services run continuously to process outbox messages, synchronize transfer statuses, auto-purchase loans, and complete batches, ensuring eventual consistency and automated workflows.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
## Orchestration with Airflow

Apache Airflow (MWAA) orchestrates complex data workflows including loan ingestion, curation, interest accrual, fee collection, and reporting on scheduled intervals.

**Used in:** [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)

---

> See also: [System Overview](./system-overview.md)

*Generated: 2026-04-16T12:55:41.324Z*