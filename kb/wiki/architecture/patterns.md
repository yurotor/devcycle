# Architecture Patterns

Shared architectural patterns across the system.

## Outbox Pattern

Reliable event publishing using transactional outbox tables for transfers, fees, batches, interest, notifications, and reporting

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
## Event-Driven Architecture

Asynchronous communication via hooks, SQS queues, and NServiceBus for loan events, status changes, and financial operations

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
## Multi-Tenant Architecture

Tenant isolation for MPLs, Banks, and Investors with tenant-specific data access and authorization

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
## CQRS

Separation of command operations (purchases, transfers) from query operations (reporting, analytics)

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)
## Repository Pattern

Data access abstraction layer separating business logic from persistence

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)
## ETL/ELT Pipeline

Extract-Transform-Load workflows orchestrated by Airflow with dbt transformations

**Used in:** [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)
## Functional Core/Imperative Shell

F# business logic with pure functions wrapped by C# imperative API layer

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
## Microservices

Independently deployable services with clear boundaries: UI, API, AI, Hooks, Ingestion, Data Utils

**Used in:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)
## API Gateway Pattern

FastAPI serving as gateway for AI requests with authentication, streaming, and rate limiting

**Used in:** [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
## Container-Based Deployment

Docker containers for all services deployed on AWS ECS Fargate

**Used in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)
## Infrastructure as Code

Terraform and Terragrunt managing AWS resources with multi-environment configuration

**Used in:** [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)

---

> See also: [System Overview](./system-overview.md)

*Generated: 2026-04-12T12:35:48.598Z*