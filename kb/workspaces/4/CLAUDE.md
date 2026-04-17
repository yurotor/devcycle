# DevCycle Knowledge Base

The COS (Customer Operations System) is a distributed banking platform built for Cross River Bank (CRB) that provides core banking operations including customer management, accounting, transaction processing, and payment operations. The system is built on a microservices architecture with 4 core service repositories (core, core-ht, core-explorer, core-payments) supported by 25 shared library repositories that provide common infrastructure for messaging, data access, security, API development, and deployment. The platform uses a multi-database approach (SQL Server and PostgreSQL) with NHibernate ORM, implements asynchronous messaging via RabbitMQ (using both NServiceBus and MassTransit), and deploys to AWS ECS with automated infrastructure provisioning via Terraform. The system supports multi-tenancy, role-based access control, distributed tracing, and integrates with external systems including New Relic for monitoring, AWS services for infrastructure, and various banking-specific integrations.

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

Total wiki pages: 46

*Generated: 2026-04-17T10:28:06.894Z*