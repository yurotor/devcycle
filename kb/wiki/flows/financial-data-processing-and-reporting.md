# Financial Data Processing and Reporting

The Financial Data Processing and Reporting flow is an end-to-end process that handles the ingestion, processing, and reporting of financial data related to loans in a lending and selling platform. It begins with data collection from various sources including marketplace lenders, servicing data, SOFR rates, and contract information through the ingestion services.

Once ingested, the data undergoes transformation and curation through Airflow DAGs that handle interest accrual calculations, fee processing, and account management. The processed data is stored in databases and data warehouses where it can be further transformed using dbt models in the datatools repository. This enables the system to generate financial reports, perform volume and seasoning analysis, and prepare data for regulatory compliance.

The flow concludes with the production of various financial reports including presale reporting, fee collection summaries, and interest accrual statements that are made available through data exports to external systems and downstream consumers.

## Steps

1. Data Ingestion: Collection of loan data, servicing information, SOFR rates, and contract data from external sources through cos-lending-selling-ingestion
2. Account Resolution: Mapping loans to appropriate accounts using cos-lending-selling-data-utils to ensure proper financial attribution
3. Data Transformation: Processing raw data through Airflow DAGs in cos-lending-selling-dags to perform interest calculations and fee processing
4. Data Modeling: Creating analytical models using dbt in cos-lending-selling-datatools for further analysis
5. Fee and Interest Processing: Calculating fees and accruing interest based on loan characteristics and SOFR rates
6. Reporting Generation: Creating financial reports including presale reporting, volume fee true-ups, and interest statements
7. Data Export: Exporting processed financial data to downstream systems and stakeholders

## Repos Involved

[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)

## Data Entities

[Loan](../data-model/entities.md), [Account](../data-model/entities.md), [Fee](../data-model/entities.md), [LoanAction](../data-model/entities.md), [Batch](../data-model/entities.md), [MPL](../data-model/entities.md), [Organization](../data-model/entities.md), [Interest](../data-model/entities.md), [Contract](../data-model/entities.md), [LoanAccount](../data-model/entities.md), [ObjectiveAccount](../data-model/entities.md), [FeeSweep](../data-model/entities.md), [CustomPurchaseAccountMapping](../data-model/entities.md), [Termsheet](../data-model/entities.md), [ServicingValue](../data-model/entities.md), [ServicingTimestamp](../data-model/entities.md), [Sofr](../data-model/entities.md)

## External Systems

- SOFR data source
- Loan data source
- Contract data source
- Volume data source
- Servicing data source
- CRB.CosLending.Accounting.Api
- AWS S3
- AWS CloudWatch
- AWS Athena
- Federal Reserve API

## Open Questions

- cos-lending-selling-dags references 'Volume fee true-up processing' but the specific calculation logic for true-ups is not clearly defined
- cos-lending-selling-ingestion mentions 'MplBootstrapping' entity but its purpose and relationship to the financial flow is unclear
- cos-lending-selling-data-utils references 'CustomPurchaseAccountMapping' but the rules governing these custom mappings are not explicitly defined

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T14:23:22.318Z*