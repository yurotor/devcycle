# Loan Data Ingestion and Integration

The Loan Data Ingestion and Integration flow manages the end-to-end process of acquiring loan data from various marketplace lenders (MPLs), transforming it, and integrating it into the Lending Selling platform. Raw loan data is first ingested from external MPL sources via APIs or S3 file uploads, then validated, transformed and loaded into the selling database. This data is then made available for various downstream processes including interest accrual, fee calculations, and reporting.

Once data is loaded into the database, Airflow DAGs orchestrate subsequent processing steps including enrichment with servicing data, SOFR rate applications, contract associations, and transformation for reporting needs. The flow includes data quality checks, error handling, and CloudWatch metrics collection to monitor the health and performance of the ingestion processes.

## Steps

1. 1: Raw loan data collection from marketplace lenders via APIs or S3
2. 2: Data validation and transformation for database compatibility
3. 3: Loading validated data into PostgreSQL selling database
4. 4: Enrichment with servicing data from S3 CSV files
5. 5: SOFR rate ingestion from Federal Reserve API
6. 6: Contract data synchronization between systems
7. 7: Airflow DAG execution for data curation and processing
8. 8: Fee collection and interest accrual calculations
9. 9: Data export for reporting purposes
10. 10: Performance monitoring via CloudWatch metrics

## Repos Involved

[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)

## Data Entities

[Loan](../data-model/entities.md), [Account](../data-model/entities.md), [Contract](../data-model/entities.md), [Fee](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Mpl](../data-model/entities.md), [ServicingValue](../data-model/entities.md), [Sofr](../data-model/entities.md), [Batch](../data-model/entities.md), [LoanAccount](../data-model/entities.md)

## External Systems

- Federal Reserve API
- AWS S3
- AWS CloudWatch
- AWS Athena
- External loan data API
- External contract data API

## Open Questions

- The cos-lending-selling-ingestion repo references MplBootstrapping but doesn't define which specific MPLs are integrated
- The data structure required by the Cos.Lending.Selling.DbModel for loan ingestion has validation rules not explicitly defined in the repos

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T12:35:48.598Z*