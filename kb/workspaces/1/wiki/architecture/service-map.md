# Service Map

How the repositories in this system relate to each other.

- **[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)** — Core business logic service handling loan purchases, interest accruals, fee processing, batch operations, and transfer orchestration. Contains outbox processors as background services for asynchronous workflows.
  - Communicates with: [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS (Core Banking)](../repos/cos-core-banking.md), [AWS SQS](../repos/aws-sqs.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** — React-based frontend application providing user interfaces for loan management, purchasing workflows, filtering, approval management, and AI-powered loan history chat.
  - Communicates with: [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [OAuth Identity Provider](../repos/oauth-identity-provider.md)
- **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** — Event notification service that publishes domain events (loan status changes, batch completions, fee charges, investor changes) to external systems via hooks pattern using NServiceBus.
  - Communicates with: [CRB.CosLending.Hooks.Hub.Service](../repos/crb-coslending-hooks-hub-service.md), [OAuth Identity Provider](../repos/oauth-identity-provider.md)
- **[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)** — Shared database model library defining Entity Framework Core entities, database context, migrations, and outbox tables for the PostgreSQL Selling database. Used by WebApi and data utilities.
  - Communicates with: [PostgreSQL Selling Database](../repos/postgresql-selling-database.md)
- **[Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)** — Shared F# contract library providing immutable DTOs and data models used across services for type-safe inter-service communication.
  - Communicates with: [None (referenced as library by other services)](../repos/none-referenced-as-library-by-other-services.md)
- **[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)** — Python FastAPI service providing AI-powered natural language query capabilities over loan data using AWS Bedrock Claude model. Executes generated SQL queries and streams responses.
  - Communicates with: [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [AWS Bedrock](../repos/aws-bedrock.md), [AWS DynamoDB](../repos/aws-dynamodb.md), [OAuth Identity Provider](../repos/oauth-identity-provider.md), [AWS Secrets Manager](../repos/aws-secrets-manager.md)
- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** — Python ETL service for ingesting loan data from external systems (Arix, Contracts DB, SOFR API) and S3 servicing files into Selling database. Runs as containerized tasks.
  - Communicates with: [Arix Database](../repos/arix-database.md), [Contracts Database](../repos/contracts-database.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [AWS S3](../repos/aws-s3.md), [AWS Secrets Manager](../repos/aws-secrets-manager.md), [Federal Reserve API](../repos/federal-reserve-api.md), [Vampire System](../repos/vampire-system.md), [AWS CloudWatch](../repos/aws-cloudwatch.md)
- **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** — Apache Airflow DAGs orchestrating data workflows including loan ingestion, curation, interest accrual, fee collection, SOFR ingestion, and reporting. Runs on AWS MWAA.
  - Communicates with: [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [AWS ECS](../repos/aws-ecs.md), [AWS Athena](../repos/aws-athena.md), [AWS S3](../repos/aws-s3.md), [Vampire System](../repos/vampire-system.md)
- **[cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)** — Data engineering repository containing dbt models and Python scripts for transforming operational data into analytical models. Supports data export to S3/Athena data lake.
  - Communicates with: [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [AWS S3](../repos/aws-s3.md), [AWS Athena](../repos/aws-athena.md), [AWS Secrets Manager](../repos/aws-secrets-manager.md)
- **[cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)** — Utility service for resolving and mapping loan accounts to proper financial account structures. Queries accounting system and updates Selling database with account mappings.
  - Communicates with: [CRB.CosLending.Accounting.Api](../repos/crb-coslending-accounting-api.md), [MPLConsumerLoansOperations Database](../repos/mplconsumerloansoperations-database.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [OAuth Identity Provider](../repos/oauth-identity-provider.md)
- **[cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)** — End-to-end testing framework simulating the entire selling environment with mock COS, RabbitMQ, and databases to validate complete loan lifecycle workflows.
  - Communicates with: [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Mock COS Simulator](../repos/mock-cos-simulator.md), [RabbitMQ](../repos/rabbitmq.md), [PostgreSQL Test Database](../repos/postgresql-test-database.md), [MSSQL Test Database](../repos/mssql-test-database.md), [AWS S3](../repos/aws-s3.md)
- **[iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)** — Infrastructure as Code repository using Terragrunt/Terraform to provision and manage all AWS resources (Aurora PostgreSQL, MWAA, ECS, Lambda, S3, SQS, CloudWatch) across environments.
  - Communicates with: [All AWS services](../repos/all-aws-services.md)

---

> See also: [System Overview](./system-overview.md) | [Data Flows](./data-flows.md)

*Generated: 2026-04-16T12:55:41.324Z*