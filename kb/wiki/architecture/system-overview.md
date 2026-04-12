# System Overview

The COS Lending Selling Platform is a comprehensive loan management and secondary market system for Cross River Bank. Its business purpose is to enable Marketplace Lenders (MPLs) to purchase consumer loans originated through issuing banks, manage the complete loan lifecycle including servicing transfers, and handle all associated financial operations. The system orchestrates loan sales from Cross River Bank to MPLs, tracks loan ownership and servicing rights, automates daily interest accruals using simple or SOFR-based calculations, collects various fees (servicing, volume, origination), manages investor relationships for loan participations, and provides regulatory reporting and reconciliation capabilities. The platform supports multi-tenant operations with role-based access for internal administrators, MPLs, issuing banks, servicing banks, and investors. Key workflows include automated batch purchasing of loans, daily interest calculation and pass-through to investors, monthly fee collection with true-up processing, loan grooming and type changes based on seasoning periods, and real-time event notifications to downstream systems. The architecture follows microservices patterns with a React frontend (UI), .NET/F# backend API (WebApi), Python-based AI query service, Airflow data orchestration (DAGs), data ingestion services, and event notification service (Hooks). All services share a common PostgreSQL database schema (DbModel) and type definitions (Contracts). The system integrates with Cross River Bank's core systems (COS Transaction Service, COS Accounting Service, COS Storage Service) for financial operations, external MPL servicing systems via S3 CSV imports, Federal Reserve for SOFR rate data, and AWS services (S3, SQS, DynamoDB, Bedrock) for cloud capabilities.

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

*Generated: 2026-04-12T14:23:22.318Z*