# DevCycle Knowledge Base

The COS (Customer Operations System) is Cross River Bank's core banking platform built on a distributed microservices architecture using .NET and Node.js technologies. The system provides comprehensive banking operations including account management, payment processing, transaction handling, accounting operations, tax document management, treasury operations, and customer onboarding. The architecture is organized into three layers: 1) Shared infrastructure libraries (Crb.Cos.Commons.*) providing common functionality like database access (NHibernate/PostgreSQL), messaging (NServiceBus/MassTransit over RabbitMQ), API standardization, security, logging, and domain patterns; 2) Core business services including 'core' (main banking API with customer/accounting controllers), 'core-ht', transaction activity processors, and accounting endpoints that handle prologue entries, sweeps, tax documents, and treasury operations; 3) Supporting services including data export tools, database migration utilities, ECS autoscaling, and frontend applications (Explorer UI built with Node.js). The system runs on AWS infrastructure using ECS containers with RDS databases, communicates via asynchronous messaging through RabbitMQ, and integrates with New Relic for monitoring. The platform supports multi-tenancy with partner-based access control and enforces permission-based authorization.

## Wiki Sections

- [Architecture](wiki/architecture/system-overview.md) — system overview, service map, data flows, patterns
- [Business Flows](wiki/flows/) — end-to-end business flow documentation
- [Functional Clusters](wiki/clusters/) — cross-repo cluster analysis
- [Features](wiki/features/) — business feature documentation
- [Integrations](wiki/integrations/overview.md) — external system integrations
- [Data Model](wiki/data-model/entities.md) — consolidated entity documentation
- [Repositories](wiki/repos/) — deep per-repo reference pages

## Repositories (29)

- [Cos.Exercise.DistributedPaymentSolution](wiki/repos/cos-exercise-distributedpaymentsolution.md)
- [Crb.Cos.Commons](wiki/repos/crb-cos-commons.md)
- [Crb.Cos.Commons.Api](wiki/repos/crb-cos-commons-api.md)
- [Crb.Cos.Commons.Api.Core](wiki/repos/crb-cos-commons-api-core.md)
- [Crb.Cos.Commons.Contracts](wiki/repos/crb-cos-commons-contracts.md)
- [Crb.Cos.Commons.Data.JsonPopulator](wiki/repos/crb-cos-commons-data-jsonpopulator.md)
- [Crb.Cos.Commons.Database](wiki/repos/crb-cos-commons-database.md)
- [Crb.Cos.Commons.Domain](wiki/repos/crb-cos-commons-domain.md)
- [Crb.Cos.Commons.Endpoint](wiki/repos/crb-cos-commons-endpoint.md)
- [Crb.Cos.Commons.Logging](wiki/repos/crb-cos-commons-logging.md)
- [Crb.Cos.Commons.Messaging](wiki/repos/crb-cos-commons-messaging.md)
- [Crb.Cos.Commons.Nsb](wiki/repos/crb-cos-commons-nsb.md)
- [Crb.Cos.Commons.Nsb.Core](wiki/repos/crb-cos-commons-nsb-core.md)
- [Crb.Cos.Commons.Security](wiki/repos/crb-cos-commons-security.md)
- [Crb.Cos.Commons.Services](wiki/repos/crb-cos-commons-services.md)
- [Crb.Cos.Commons.Testing](wiki/repos/crb-cos-commons-testing.md)
- [Crb.Cos.Database.Export](wiki/repos/crb-cos-database-export.md)
- [Crb.Cos.Dbup.Database](wiki/repos/crb-cos-dbup-database.md)
- [core](wiki/repos/core.md)
- [core-explorer](wiki/repos/core-explorer.md)
- [core-ht](wiki/repos/core-ht.md)
- [core-payments](wiki/repos/core-payments.md)
- [cos-build-tools](wiki/repos/cos-build-tools.md)
- [cos-container-base-image](wiki/repos/cos-container-base-image.md)
- [cos-container-deployment](wiki/repos/cos-container-deployment.md)
- [cos-ecs-autoscaler](wiki/repos/cos-ecs-autoscaler.md)
- [cos-environment](wiki/repos/cos-environment.md)
- [cos-explorer-2](wiki/repos/cos-explorer-2.md)
- [cos-explorer-common-lib](wiki/repos/cos-explorer-common-lib.md)

Total wiki pages: 47

*Generated: 2026-04-17T10:48:40.329Z*