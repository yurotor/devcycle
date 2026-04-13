# Architecture Patterns

Shared architectural patterns across the system.

## Outbox Pattern

Used throughout the system for reliable message delivery. The DbModel defines 9 different outbox tables (TransferOutbox, FeeOutbox, BatchInitOutbox, DailyInterestOutbox, NotificationOutbox, VolumeFeeOutbox, ReportingOutbox, MaturedLoanOutbox, TrueUpVolumeFeeOutbox), and WebApi implements outbox processors that ensure reliable async operations.

**Used in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
## Event-Driven Architecture

The system uses NServiceBus and hooks pattern for publishing domain events. Events are published for loan status changes, batch completions, fee charges, and other significant business events.

**Used in:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
## Microservices Architecture

The system is decomposed into specialized services: WebApi for core business logic, Hooks for notifications, UI for presentation, AI for natural language queries, and supporting data services.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
## Multi-Language Architecture (Polyglot)

F# is used for core business logic and domain modeling (contracts and business rules), while C# handles infrastructure concerns in the WebApi. Python is used for data engineering and AI services.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
## ELT (Extract-Load-Transform)

Data is extracted from source systems, loaded into PostgreSQL warehouse, then transformed using dbt. Orchestrated by Airflow DAGs running on AWS MWAA.

**Used in:** [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
## CQRS-like Separation

The WebApi separates read and write operations. Write operations go through business logic and outbox processors, while read operations (via UI and AI) query optimized views.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
## Repository Pattern

Used across multiple services for data access abstraction with specialized repositories for each entity type.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
## Multi-Tenant Architecture

The system supports different tenant types (SellingITAdmin, InternalTenant, MplTenant, BankTenant, InvestorTenant) with role-based access control.

**Used in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)

---

> See also: [System Overview](./system-overview.md)

*Generated: 2026-04-13T06:16:29.479Z*