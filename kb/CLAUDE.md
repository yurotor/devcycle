# DevCycle Knowledge Base

The COS (Cross River Bank Operating System) Lending Selling platform is a comprehensive financial system that facilitates the secondary market for consumer loans. The system enables Cross River Bank to purchase loans originated by Marketplace Lenders (MPLs) and sell them to investors, managing the complete lifecycle from origination to sale including interest accrual, fee collection, and servicing.

**Business Purpose**: The platform serves as a loan marketplace infrastructure where MPLs (e.g., Marlette, Momnt) originate consumer loans through Cross River Bank, which then purchases these loans and sells them to investors based on contractual agreements. The system automates financial operations including daily interest calculations, various fee collections (DMV, stamp taxes, volume fees), loan grooming (investor/type changes), and comprehensive reporting.

**Key Stakeholders**: 
- Marketplace Lenders (MPLs) who originate loans
- Investors who purchase loans
- Issuing Banks involved in loan origination
- Cross River Bank internal teams managing operations

**Architecture Overview**: The system follows a modern microservices architecture with clear separation of concerns:
- **Core Business Logic**: .NET backend (WebApi) with F# for domain logic and C# for infrastructure, using PostgreSQL as the operational database
- **Frontend**: React-based UI for loan management and monitoring
- **Data Platform**: Python-based ELT pipeline orchestrated by Airflow, with dbt transformations for analytics
- **AI Layer**: Python FastAPI service providing natural language queries via AWS Bedrock
- **Integration Layer**: Hooks service for event notifications, data utilities for account resolution
- **Infrastructure**: Fully containerized deployment on AWS (ECS, Lambda, MWAA) managed via Terraform

**Reliability Patterns**: The system implements the outbox pattern extensively with 9 different outbox tables ensuring reliable async operations for transfers, fees, interest, reporting, and notifications. Event-driven architecture enables loose coupling between services.

**Data Flow**: Loans originate in external systems (Arix), are synced to the Selling platform, undergo account resolution, become eligible for purchase based on contract rules, get processed through automated or manual purchase workflows, accrue daily interest, have fees collected, and generate comprehensive reports for all stakeholders. The system handles billions of dollars in loan transactions with strict audit trails and reconciliation processes.

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

Total wiki pages: 70

*Generated: 2026-04-13T06:20:47.571Z*