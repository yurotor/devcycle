# External Integrations

All external systems that this system communicates with.

| System | Direction | Protocol | Repos |
|--------|-----------|----------|-------|
| **COS Transaction Service** | downstream | REST | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) |
| **COS Lending Accounting Service** | upstream | REST | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **COS Storage Service** | downstream | REST | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) |
| **CRB.CosLending.Hooks.Hub.Service** | downstream | NServiceBus | [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) |
| **CRB Identity Provider** | upstream | OAuth/REST | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) |
| **CRB AI Service** | upstream | REST | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) |
| **AWS Bedrock (Claude)** | upstream | REST | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **AWS S3** | bidirectional | REST | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **AWS SQS** | bidirectional | messaging | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **AWS DynamoDB** | bidirectional | AWS SDK | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **Federal Reserve API** | upstream | REST | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **Arix Database** | upstream | MSSQL | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **Contracts Database** | upstream | MSSQL | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **Volume Database** | upstream | MSSQL | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **MPLConsumerLoansOperations Database** | upstream | MSSQL | [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) |
| **Vampire System** | bidirectional | database | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-12T14:26:15.920Z*