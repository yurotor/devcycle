# External Integrations

All external systems that this system communicates with.

| System | Direction | Protocol | Repos |
|--------|-----------|----------|-------|
| **CRB Core Operating System (COS)** | bidirectional | REST | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **CRB Identity Provider (OAuth)** | upstream | REST | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) |
| **CRB Lending Accounting Service** | bidirectional | REST | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) |
| **CRB Lending Contracts Service** | upstream | REST | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) |
| **CRB Hooks Hub (NServiceBus)** | downstream | messaging | [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) |
| **AWS Bedrock (Claude LLM)** | upstream | REST | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **AWS S3** | bidirectional | REST | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **AWS SQS** | bidirectional | messaging | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md) |
| **AWS DynamoDB** | bidirectional | AWS SDK | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **Federal Reserve SOFR API** | upstream | REST | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) |
| **Arix Loan System** | upstream | database | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **Vampire System** | bidirectional | database | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **MPL S3 Buckets (Servicing Files)** | upstream | file | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) |

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-12T12:37:55.010Z*