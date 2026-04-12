# Service Map

How the repositories in this system relate to each other.

- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** — React frontend providing loan inventory management, filtering, pending approvals, and AI chat interface
  - Communicates with: [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [CRB Identity Provider](../repos/crb-identity-provider.md), [CRB Menu Service](../repos/crb-menu-service.md)
- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** — .NET backend API managing loan operations, purchases, transfers, interest accrual, fee processing, and batch operations
  - Communicates with: [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Contracts](../repos/cos-lending-contracts.md), [COS.Lending.Hooks](../repos/cos-lending-hooks.md), [COS.Lending.Accounting](../repos/cos-lending-accounting.md), [COS Storage Service](../repos/cos-storage-service.md), [COS Transaction Service](../repos/cos-transaction-service.md), [AWS SQS](../repos/aws-sqs.md)
- **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** — Event notification service publishing loan selling events to hooks hub
  - Communicates with: [CRB.CosLending.Hooks.Hub.Service](../repos/crb-coslending-hooks-hub-service.md), [NServiceBus](../repos/nservicebus.md), [OAuth Identity Provider](../repos/oauth-identity-provider.md)
- **[Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)** — Shared contract library defining data types and entities used across services
  - Communicates with: [loan-origination-service](../repos/loan-origination-service.md), [lending-service](../repos/lending-service.md), [investor-management-system](../repos/investor-management-system.md)
- **[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)** — Database schema and Entity Framework context for PostgreSQL persistence layer
  - Communicates with: [PostgreSQL](../repos/postgresql.md)
- **[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)** — Python AI service providing natural language querying of loan data using AWS Bedrock
  - Communicates with: [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [AWS Bedrock](../repos/aws-bedrock.md), [DynamoDB](../repos/dynamodb.md), [Identity Server](../repos/identity-server.md)
- **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** — Airflow DAGs orchestrating ETL workflows for loan data ingestion, interest accrual, fee collection, and reporting
  - Communicates with: [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [AWS ECS](../repos/aws-ecs.md), [PostgreSQL](../repos/postgresql.md), [Vampire system](../repos/vampire-system.md), [External SOFR API](../repos/external-sofr-api.md)
- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** — Python ETL service ingesting servicing data from MPLs via S3, synchronizing loan status, importing SOFR rates
  - Communicates with: [AWS S3](../repos/aws-s3.md), [Selling DB PostgreSQL](../repos/selling-db-postgresql.md), [Arix MSSQL](../repos/arix-mssql.md), [Contracts MSSQL](../repos/contracts-mssql.md), [Volume MSSQL](../repos/volume-mssql.md), [Vampire MSSQL](../repos/vampire-mssql.md), [Federal Reserve API](../repos/federal-reserve-api.md), [AWS Athena](../repos/aws-athena.md)
- **[cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)** — .NET utility resolving and mapping accounts for loans from accounting and operations databases
  - Communicates with: [CRB.CosLending.Accounting.Api](../repos/crb-coslending-accounting-api.md), [MPLConsumerLoansOperations DB](../repos/mplconsumerloansoperations-db.md), [Selling DB](../repos/selling-db.md), [OAuth Authorization Server](../repos/oauth-authorization-server.md)
- **[cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)** — dbt-based data warehouse providing analytics transformations for loans, contracts, fees, and volume data
  - Communicates with: [cos-lending-selling-web-api DB](../repos/cos-lending-selling-web-api-db.md), [AWS S3](../repos/aws-s3.md), [AWS Secrets Manager](../repos/aws-secrets-manager.md), [AWS ECS](../repos/aws-ecs.md)
- **[cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)** — End-to-end testing framework simulating complete loan lifecycle with mocked external services
  - Communicates with: [COS simulator](../repos/cos-simulator.md), [RabbitMQ](../repos/rabbitmq.md), [accounts-resolver](../repos/accounts-resolver.md), [web-api](../repos/web-api.md), [hooks](../repos/hooks.md), [PostgreSQL](../repos/postgresql.md), [AWS S3](../repos/aws-s3.md)
- **[iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)** — Terraform/Terragrunt infrastructure provisioning AWS resources (Aurora, MWAA, ECS, Lambda, SQS)
  - Communicates with: [Aurora PostgreSQL](../repos/aurora-postgresql.md), [AWS MWAA](../repos/aws-mwaa.md), [AWS ECS](../repos/aws-ecs.md), [AWS Lambda](../repos/aws-lambda.md), [AWS SQS](../repos/aws-sqs.md), [AWS S3](../repos/aws-s3.md)

---

> See also: [System Overview](./system-overview.md) | [Data Flows](./data-flows.md)

*Generated: 2026-04-12T12:35:48.597Z*