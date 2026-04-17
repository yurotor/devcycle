# DevCycle Knowledge Base

The COS Lending Selling platform is a comprehensive loan marketplace and servicing system for Cross River Bank that enables marketplace lenders (MPLs), investors, and issuing banks to purchase, sell, and manage consumer loans. The system handles the complete loan lifecycle from ingestion through purchase, including complex financial operations such as interest accruals (using Standard, SOFR-based, or Combined calculation methods), volume fee collection with monthly true-up processing, multiple fee types (DMV, stamp tax, merchant fees), and loan grooming operations (type changes, investor reassignments). Built as a distributed microservices architecture on AWS, the platform consists of: (1) A .NET Core WebApi service handling business logic and background processing using the outbox pattern for reliable messaging; (2) A React UI providing role-based access for internal and external users; (3) An AI-powered Python service using AWS Bedrock Claude for natural language querying of loan data; (4) Multiple data integration services for ETL from external systems (Arix core banking, contracts database, SOFR rates); (5) Apache Airflow orchestration for scheduled workflows; (6) An event notification service publishing domain events via NServiceBus hooks; and (7) Supporting infrastructure for data warehousing, analytics, and monitoring. The system emphasizes financial accuracy with eventual consistency through outbox patterns, transfer status synchronization with the core banking system, and comprehensive audit trails. Multi-tenant architecture supports different user types (CRB staff, MPL agents, investors, issuing banks) with fine-grained permissions. Data flows through the system from external sources into a PostgreSQL operational database, with transformations via dbt into analytical models exported to S3/Athena for reporting. The platform integrates deeply with Cross River Bank's core banking system (COS) for financial transfers and account management while maintaining its own operational database for loan selling-specific workflows.

## Wiki Sections

- [Architecture](wiki/architecture/system-overview.md) — system overview, service map, data flows, patterns
- [Business Flows](wiki/flows/) — end-to-end business flow documentation
- [Functional Clusters](wiki/clusters/) — cross-repo cluster analysis
- [Features](wiki/features/) — business feature documentation
- [Integrations](wiki/integrations/overview.md) — external system integrations
- [Data Model](wiki/data-model/entities.md) — consolidated entity documentation
- [Repositories](wiki/repos/) — deep per-repo reference pages

## Repositories (12)

- [COS.Lending.Selling.Hooks](wiki/repos/cos-lending-selling-hooks.md)
- [COS.Lending.Selling.UI](wiki/repos/cos-lending-selling-ui.md)
- [COS.Lending.Selling.WebApi](wiki/repos/cos-lending-selling-webapi.md)
- [Cos.Lending.Selling.Contracts](wiki/repos/cos-lending-selling-contracts.md)
- [Cos.Lending.Selling.DbModel](wiki/repos/cos-lending-selling-dbmodel.md)
- [cos-lending-selling-ai](wiki/repos/cos-lending-selling-ai.md)
- [cos-lending-selling-dags](wiki/repos/cos-lending-selling-dags.md)
- [cos-lending-selling-data-utils](wiki/repos/cos-lending-selling-data-utils.md)
- [cos-lending-selling-datatools](wiki/repos/cos-lending-selling-datatools.md)
- [cos-lending-selling-e2e-tests](wiki/repos/cos-lending-selling-e2e-tests.md)
- [cos-lending-selling-ingestion](wiki/repos/cos-lending-selling-ingestion.md)
- [iac-cos-lending-selling](wiki/repos/iac-cos-lending-selling.md)

Total wiki pages: 77

*Generated: 2026-04-16T13:01:33.731Z*