# Data Ingestion and Processing

The Data Ingestion and Processing flow manages the end-to-end lifecycle of loan data from external sources into the Cross River Bank lending and selling platform. It starts with ingesting data from various marketplace lenders (MPLs), servicing sources, SOFR rates from the Federal Reserve API, and contract data from external systems into the selling database. This raw data is then validated, transformed, and curated for operational use.

After ingestion, the data undergoes processing through orchestrated Airflow DAGs that handle interest accrual calculations, fee collection, seasoning analysis, and batch processing. The processed data supports core business functions including loan management, investor relationships, and financial operations. Throughout this pipeline, data quality checks are performed and monitoring metrics are published to CloudWatch to ensure system reliability.

## Steps

1. Data Source Connection: Connect to external data sources including MPLs, servicing data in S3, Federal Reserve API, and contract databases
2. Raw Data Extraction: Extract loan data, servicing information, SOFR rates, and contract details from source systems
3. Data Validation: Validate incoming data against schema definitions and business rules
4. Data Transformation: Transform raw data into standardized formats compatible with the selling database
5. Data Loading: Load validated and transformed data into the Cos.Lending.Selling database
6. DAG Orchestration: Trigger appropriate Airflow DAGs based on data type and processing requirements
7. Processing Pipeline Execution: Execute specialized processing including interest calculations, fee collections, and seasoning analysis
8. Data Curation: Curate processed data for reporting and analytical purposes
9. Metric Publication: Publish processing metrics to CloudWatch for monitoring
10. Data Export: Export processed data to reporting systems and downstream consumers

## Repos Involved

[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)

## Data Entities

[Loan](../data-model/entities.md), [Account](../data-model/entities.md), [Fee](../data-model/entities.md), [Contract](../data-model/entities.md), [ServicingValue](../data-model/entities.md), [ServicingTimestamp](../data-model/entities.md), [Sofr](../data-model/entities.md), [MplBootstrapping](../data-model/entities.md), [Batch](../data-model/entities.md), [Interest](../data-model/entities.md), [Organization](../data-model/entities.md), [LoanAction](../data-model/entities.md)

## External Systems

- Federal Reserve API
- AWS S3
- AWS CloudWatch
- AWS Athena
- SOFR data source
- Vampire
- Loan data source
- Contract data source
- Servicing data source
- Arix database

## Open Questions

- The coordination mechanism between ingestion and DAG triggering is not clearly defined
- Error handling and recovery procedures across the entire flow
- How data lineage is tracked across the different systems
- Integration points with notification systems for processing failures
- Complete end-to-end SLA for the ingestion and processing pipeline

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-16T12:55:41.325Z*