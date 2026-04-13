# External Integrations

All external systems that this system communicates with.

| System | Direction | Protocol | Repos |
|--------|-----------|----------|-------|
| **COS (Core Operating System)** | downstream | REST/Messaging | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **CRB.CosLending.Accounting.Api** | upstream | REST | [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **CRB.CosLending.Hooks.Hub.Service** | downstream | NServiceBus/Messaging | [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) |
| **AWS Bedrock (Claude LLM)** | upstream | REST | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **AWS S3** | bidirectional | AWS SDK | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) |
| **AWS DynamoDB** | bidirectional | AWS SDK | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **AWS Secrets Manager** | upstream | AWS SDK | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md) |
| **AWS Athena** | upstream | AWS SDK | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **CRB Identity Provider (OAuth)** | upstream | OAuth/REST | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **CRB Menu Service** | upstream | REST | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) |
| **Federal Reserve API (SOFR Rates)** | upstream | REST | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **CloudWatch** | downstream | AWS SDK | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md) |
| **Arix Loan System (MSSQL)** | upstream | Database/ODBC | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **Vampire System (MSSQL)** | bidirectional | Database | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) |
| **MPLConsumerLoansOperations Database** | upstream | Database/ODBC | [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) |
| **Contracts Database (MSSQL)** | upstream | Database | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **Volume Database (MSSQL)** | upstream | Database | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **TestRail** | upstream | REST | [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **MPL Servicing Systems** | upstream | File/S3 | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) |

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-13T06:20:47.564Z*