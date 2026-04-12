# Data Ingestion to Analytics

The Data Ingestion to Analytics flow represents the end-to-end process of capturing loan data from various external sources, transforming it through multiple stages, and making it available for analytical consumption. Raw data originates from diverse sources including marketplace lenders (MPLs), servicing systems, the Federal Reserve (SOFR rates), and other contract and volume data sources. The ingestion layer captures and normalizes this data before storing it in transactional databases.

Once ingested, Airflow DAGs orchestrate the data transformation workflow, including interest accrual calculations, fee processing, and various loan-related operations. The data is further processed using dbt models that transform it into analytics-ready datasets stored in a warehouse. This enables business reporting on loan performance, volume fee analysis, and servicing metrics that support decision-making in the lending and selling platform.

## Steps

1. 1: External data acquisition - Raw data from various sources (marketplace lenders, SOFR rates, servicing data) is collected by the ingestion service and validated
2. 2: Data normalization - Raw data is normalized and stored in the primary database (SellingContext) using the defined entity models
3. 3: Orchestrated transformation - Airflow DAGs trigger transformation workflows that process loan data, calculate interest, manage fees, and create derived datasets
4. 4: Analytical modeling - The datatools repository applies dbt models to transform operational data into analytics-ready structures
5. 5: Data warehouse loading - Transformed data is loaded into the analytics warehouse for reporting and business intelligence
6. 6: Reporting and exports - Final data is made available through exports, reports, and dashboards for business users

## Repos Involved

[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)

## Data Entities

[Loan](../data-model/entities.md), [Contract](../data-model/entities.md), [Fee](../data-model/entities.md), [Interest](../data-model/entities.md), [Account](../data-model/entities.md), [Batch](../data-model/entities.md), [ServicingValue](../data-model/entities.md), [Sofr](../data-model/entities.md), [MPL](../data-model/entities.md), [Organization](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Termsheet](../data-model/entities.md), [Seasoning](../data-model/entities.md), [Tiering](../data-model/entities.md)

## External Systems

- Federal Reserve API
- Vampire
- AWS S3
- PostgreSQL database
- AWS Athena
- SOFR data source
- Loan data source
- Contract data source
- Volume data source
- Servicing data source

## Open Questions

- The exact handoff mechanism between cos-lending-selling-ingestion and cos-lending-selling-dags is not clear - are DAGs triggered automatically upon successful ingestion?
- The PostgreSQL warehouse mentioned in cos-lending-selling-datatools dependencies doesn't specify if it's the same database used by the Cos.Lending.Selling.DbModel or a separate analytics warehouse
- The 'Vampire system' referenced in the dags repository is mentioned as an external system but its specific role in the data flow isn't defined
- The message pattern 'TransferOutbox' in Cos.Lending.Selling.DbModel suggests an event-driven component, but how these outbox messages integrate into the analytics flow isn't specified

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T12:35:48.598Z*