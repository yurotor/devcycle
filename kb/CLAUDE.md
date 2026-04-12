# DevCycle Knowledge Base

The COS Lending Selling Platform is a comprehensive loan management and secondary market system for Cross River Bank. Its business purpose is to enable Marketplace Lenders (MPLs) to purchase consumer loans originated through issuing banks, manage the complete loan lifecycle including servicing transfers, and handle all associated financial operations. The system orchestrates loan sales from Cross River Bank to MPLs, tracks loan ownership and servicing rights, automates daily interest accruals using simple or SOFR-based calculations, collects various fees (servicing, volume, origination), manages investor relationships for loan participations, and provides regulatory reporting and reconciliation capabilities. The platform supports multi-tenant operations with role-based access for internal administrators, MPLs, issuing banks, servicing banks, and investors. Key workflows include automated batch purchasing of loans, daily interest calculation and pass-through to investors, monthly fee collection with true-up processing, loan grooming and type changes based on seasoning periods, and real-time event notifications to downstream systems. The architecture follows microservices patterns with a React frontend (UI), .NET/F# backend API (WebApi), Python-based AI query service, Airflow data orchestration (DAGs), data ingestion services, and event notification service (Hooks). All services share a common PostgreSQL database schema (DbModel) and type definitions (Contracts). The system integrates with Cross River Bank's core systems (COS Transaction Service, COS Accounting Service, COS Storage Service) for financial operations, external MPL servicing systems via S3 CSV imports, Federal Reserve for SOFR rate data, and AWS services (S3, SQS, DynamoDB, Bedrock) for cloud capabilities.

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

Total wiki pages: 68

*Generated: 2026-04-12T14:26:15.925Z*