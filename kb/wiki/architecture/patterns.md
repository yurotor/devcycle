# Architecture Patterns

Shared architectural patterns across the system.

## Event-Driven Architecture with Outbox Pattern

WebApi uses multiple outbox tables (TransferOutbox, FeeOutbox, NotificationOutbox, etc.) to ensure reliable event publishing to downstream systems. The outbox processors poll these tables and dispatch events via SQS and HTTP, guaranteeing at-least-once delivery semantics.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
## Microservices with Domain Separation

System is decomposed into focused services: WebApi for business logic, Hooks for notifications, AI for natural language queries, Ingestion for data synchronization, and DAGs for orchestration. Each service owns its domain and communicates via REST APIs and messaging.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
## Multi-Tenant Architecture with Tenant Isolation

System supports multiple tenant types (SellingITAdmin, InternalTenant, MplTenant, BankTenant, InvestorTenant) with application-level tenant filtering applied to database queries. Each user session is scoped to a specific tenant context.

**Used in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
## Functional Core, Imperative Shell

WebApi implements business logic in F# (functional core) for interest calculations, fee processing, and loan operations, while C# handles API layer, infrastructure, and I/O (imperative shell). This separates pure business rules from side effects.

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
## Extract-Load-Transform (ELT) Data Pipeline

Airflow DAGs orchestrate data movement from source systems (Arix, Contracts, Volume, SOFR) into PostgreSQL warehouse, then transform using DBT. Raw data is loaded first, then transformed in-database for performance.

**Used in:** [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
## Contract-First Design with Shared Libraries

Cos.Lending.Selling.Contracts defines canonical data types in F# that are shared across all services, ensuring type safety and consistent domain modeling across the distributed system.

**Used in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
## Repository Pattern with Entity Framework

Data access is abstracted through repository interfaces, with Entity Framework Core providing ORM capabilities. This allows business logic to remain database-agnostic and facilitates testing.

**Used in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)

---

> See also: [System Overview](./system-overview.md)

*Generated: 2026-04-12T14:23:22.318Z*