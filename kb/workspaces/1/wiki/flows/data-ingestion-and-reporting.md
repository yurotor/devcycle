# Data Ingestion and Reporting

The Data Ingestion and Reporting flow captures loan and financial data from multiple sources, transforms it into a consistent format, and generates reports for business analysis. Raw data from marketplace lenders (MPLs), servicing systems, and external sources like the Federal Reserve is ingested, validated, and stored in the main lending database. This data is then processed by ETL pipelines implemented as Airflow DAGs.

Once ingested, the data undergoes transformation and enrichment using dbt models in the datatools repository. The process includes loan data curation, fee calculations, interest accruals, and contract processing. After transformation, the data is exported to data warehouses and reporting systems where it's used to generate various financial and operational reports, including presale reporting, volume fee analysis, and loan seasoning metrics.

## Steps

1. Step 1: Data source identification and connection - Systems connect to various data sources including MPLs, servicing data in S3, Federal Reserve API for SOFR rates, and internal databases
2. Step 2: Raw data extraction - cos-lending-selling-ingestion extracts raw data from identified sources using appropriate connectors
3. Step 3: Data validation and cleansing - Raw data undergoes validation to ensure quality and consistency
4. Step 4: Data storage - Validated data is stored in the Cos.Lending.Selling.DbModel database using defined entity models
5. Step 5: ETL workflow execution - cos-lending-selling-dags orchestrates transformation workflows using Airflow DAGs
6. Step 6: Data transformation - cos-lending-selling-datatools transforms raw data using dbt models for analytics purposes
7. Step 7: Data enrichment - Additional calculations like interest accruals, fee processing, and loan seasoning are performed
8. Step 8: Report generation - Transformed data is used to generate various reports including presale reporting and volume analysis
9. Step 9: Data export - Final reports and datasets are exported to downstream systems for business consumption

## Repos Involved

[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)

## Data Entities

[Loan](../data-model/entities.md), [Contract](../data-model/entities.md), [Fee](../data-model/entities.md), [Interest](../data-model/entities.md), [Batch](../data-model/entities.md), [MPL](../data-model/entities.md), [ServicingValue](../data-model/entities.md), [ServicingTimestamp](../data-model/entities.md), [Sofr](../data-model/entities.md), [Transfer](../data-model/entities.md), [Account](../data-model/entities.md), [LoanAccount](../data-model/entities.md), [Termsheet](../data-model/entities.md)

## External Systems

- Federal Reserve API
- AWS S3
- AWS CloudWatch
- AWS Athena
- Vampire
- COS Lending Selling Web API

## Open Questions

- The exact data mapping between Federal Reserve API and the SOFR entity in cos-lending-selling-ingestion is not defined
- The relationship between the ReportingOutbox message pattern in Cos.Lending.Selling.DbModel and the reporting process in the DAGs is not clear
- The Vampire system referenced in cos-lending-selling-dags lacks clear definition of what data it provides to the pipeline
- The exact mechanism for how data flows from ServicingValue entities in cos-lending-selling-ingestion to the servicing data processing in the DAGs

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-16T12:55:41.325Z*