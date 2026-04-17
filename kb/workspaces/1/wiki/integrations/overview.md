# External Integrations

All external systems that this system communicates with.

| System | Direction | Protocol | Repos |
|--------|-----------|----------|-------|
| **COS (Core Operating System) / Cross River Bank Core Banking** | bidirectional | REST API for transfers, MSSQL database queries (Arix DB) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **CRB.CosLending.Accounting.Api** | upstream | REST API | [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) |
| **CRB.CosLending.Hooks.Hub.Service** | downstream | NServiceBus messaging | [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) |
| **OAuth Identity Provider (idp.crbcos.com / idptest.crbcos.com)** | upstream | OAuth 2.0 / OpenID Connect | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) |
| **AWS Bedrock (Claude AI)** | upstream | REST API | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **AWS S3** | bidirectional | AWS SDK | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md) |
| **AWS DynamoDB** | bidirectional | AWS SDK | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **AWS SQS** | bidirectional | AWS SDK | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md) |
| **AWS Secrets Manager** | upstream | AWS SDK | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) |
| **AWS Athena** | upstream | AWS SDK | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **AWS CloudWatch** | downstream | AWS SDK | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md) |
| **Federal Reserve SOFR API** | upstream | REST API | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) |
| **Vampire System** | bidirectional | MSSQL database | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) |
| **Arix Core Banking System** | upstream | MSSQL database queries | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **Contracts Database** | upstream | MSSQL database queries | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) |
| **MPLConsumerLoansOperations Database** | upstream | SQL Server database queries | [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md) |
| **RabbitMQ** | bidirectional | AMQP messaging | [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md) |
| **External MPL Servicing Systems** | upstream | CSV files via S3 | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) |
| **Apache Airflow (AWS MWAA)** | orchestrator | Python DAG execution | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md) |
| **New Relic** | downstream | APM integration | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) |

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-16T13:01:33.724Z*