# Data Engineering and Processing

## Shared Entities

- **Loan** — Core loan data representing loan contracts with status, type, and sale information. Flows from ingestion repo to dags for processing and to datatools for analytics. ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Contract** — Agreements between CRB and partner institutions with terms and parameters, ingested and transformed for analytics. ([cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Fee** — Fee structures and collection records used in processing workflows and analytics. ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **Interest** — Interest accrual records and rate information used in calculations and reporting. ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **ServicingValue** — Loan servicing data including adjusted loan amounts and interest paid, ingested and then processed by DAGs. ([cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md))
- **SOFR** — SOFR rates ingested from Federal Reserve API and used in interest calculations. ([cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md))

## Data Flows

### Loan Data Processing

End-to-end flow from ingestion of loan data to processing and analytics

  1. Ingest loan data from external sources
  2. Store raw data in S3
  3. Process with Airflow DAGs
  4. Transform using dbt
  5. Load into data warehouse for analytics
### SOFR Rate Processing

Ingestion and application of SOFR rates for interest calculations

  1. Fetch SOFR rates from Federal Reserve API
  2. Store rates in database
  3. Apply rates in interest accrual calculations
  4. Include in analytics
### Servicing Data Processing

Processing of loan servicing information for accounting and reporting

  1. Ingest servicing data from files in S3
  2. Process and validate data
  3. Apply to loans via DAGs
  4. Generate reports on servicing status

## Integration Points

- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** → **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** via shared-db: Raw loan, contract, and servicing data is ingested and stored in databases accessed by DAGs for processing.
- **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** → **[cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)** via shared-db: Processed loan data and calculated values from DAGs are accessed by datatools for analytics and reporting.
- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** → **[AWS S3](../repos/aws-s3.md)** via file: Raw servicing data files are ingested and stored in S3 for further processing.
- **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** → **[AWS S3](../repos/aws-s3.md)** via database: Processed data and reports are stored in S3 for downstream consumption.

## Patterns

- **ETL Pipeline** — Extract-Transform-Load pattern used across all repos for data processing ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Data Orchestration** — Using Airflow DAGs to schedule and coordinate data processing tasks ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md))
- **Data Transformation** — Using dbt for SQL-based transformations of raw data into analytics-ready formats ([cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **Event-Based Processing** — Processing data based on ingestion completion events ([cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))

## Open Questions

- The specific business rules governing loan seasoning calculations in cos-lending-selling-dags
- The interaction between MPL (Marketplace Lender) entity in cos-lending-selling-dags and MplBootstrapping in cos-lending-selling-ingestion
- The specific metrics reported to CloudWatch from cos-lending-selling-ingestion and how they're used for monitoring

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-16T12:55:41.326Z*