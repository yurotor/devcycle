# Loan Data Analytics and Reporting

The Loan Data Analytics and Reporting flow encompasses the end-to-end process of extracting, transforming, analyzing, and reporting on loan data across the lending and selling platform. Raw data from various operational sources is ingested into data warehouses, processed through ETL pipelines, and made available for analytical reporting to support business intelligence, compliance requirements, and decision-making processes.

The flow begins with scheduled data extraction from operational databases and external sources via Airflow DAGs, followed by transformation using dbt models that normalize, cleanse, and enrich the data. Processed data is then stored in analytical data marts optimized for reporting. Business users can access these insights through reports and dashboards that provide visibility into loan performance, fee collections, interest accruals, MPL relationships, and other key business metrics.

## Steps

1. 1: Data extraction - Scheduled Airflow DAGs extract raw loan data, contract information, fee details, and interest history from operational databases and external sources
2. 2: Data transformation - DBT models process raw data through cleaning, normalization, enrichment, and business rule application
3. 3: Data loading - Transformed data is loaded into analytics data warehouse tables and materialized views
4. 4: SOFR rate integration - External SOFR rates are ingested and applied to loan calculations
5. 5: Reporting data preparation - Key metrics and KPIs are calculated and aggregated
6. 6: Data export - Analytical datasets are exported to reporting systems and S3 for consumption
7. 7: Report generation - Business intelligence tools consume prepared datasets to generate operational, regulatory, and management reports

## Repos Involved

[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)

## Data Entities

[Loan](../data-model/entities.md), [Account](../data-model/entities.md), [Fee](../data-model/entities.md), [Contract](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Transfer](../data-model/entities.md), [Batch](../data-model/entities.md), [Mpl](../data-model/entities.md), [VolumeFeeMonthlyMinimum](../data-model/entities.md), [LoanAction](../data-model/entities.md), [Organization](../data-model/entities.md), [Investor](../data-model/entities.md), [Termsheet](../data-model/entities.md), [Seasoning](../data-model/entities.md), [Tiering](../data-model/entities.md)

## External Systems

- AWS S3
- AWS Athena
- SOFR data source
- Vampire system
- Cross River Bank COS
- Lending Contracts Service

## Open Questions

- The exact business rules for data aggregation and summarization for specific report types
- The complete data lineage showing how specific loan metrics are derived from source systems
- The reconciliation process between analytical data and operational systems to ensure accuracy
- The frequency and business triggers for non-scheduled ad-hoc reporting requests

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T14:23:22.318Z*