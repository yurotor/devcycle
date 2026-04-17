# System Overview

The COS Lending Selling platform is a comprehensive loan marketplace and servicing system for Cross River Bank that enables marketplace lenders (MPLs), investors, and issuing banks to purchase, sell, and manage consumer loans. The system handles the complete loan lifecycle from ingestion through purchase, including complex financial operations such as interest accruals (using Standard, SOFR-based, or Combined calculation methods), volume fee collection with monthly true-up processing, multiple fee types (DMV, stamp tax, merchant fees), and loan grooming operations (type changes, investor reassignments). Built as a distributed microservices architecture on AWS, the platform consists of: (1) A .NET Core WebApi service handling business logic and background processing using the outbox pattern for reliable messaging; (2) A React UI providing role-based access for internal and external users; (3) An AI-powered Python service using AWS Bedrock Claude for natural language querying of loan data; (4) Multiple data integration services for ETL from external systems (Arix core banking, contracts database, SOFR rates); (5) Apache Airflow orchestration for scheduled workflows; (6) An event notification service publishing domain events via NServiceBus hooks; and (7) Supporting infrastructure for data warehousing, analytics, and monitoring. The system emphasizes financial accuracy with eventual consistency through outbox patterns, transfer status synchronization with the core banking system, and comprehensive audit trails. Multi-tenant architecture supports different user types (CRB staff, MPL agents, investors, issuing banks) with fine-grained permissions. Data flows through the system from external sources into a PostgreSQL operational database, with transformations via dbt into analytical models exported to S3/Athena for reporting. The platform integrates deeply with Cross River Bank's core banking system (COS) for financial transfers and account management while maintaining its own operational database for loan selling-specific workflows.

## Repositories

- [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
- [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
- [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
- [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)
- [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)
- [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
- [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
- [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)

---

> See also: [Service Map](./service-map.md) | [Data Flows](./data-flows.md) | [Architecture Patterns](./patterns.md)

*Generated: 2026-04-16T12:55:41.324Z*