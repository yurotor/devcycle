# Data Processing and Analytics

## Shared Entities

- **Loan** — Core loan data representing loan contracts with attributes like status, type, and sale information. Flows from ingestion to processing to analytics pipelines. ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Contract** — Agreement terms between CRB and partner institutions with effective dates and parameters, ingested and then processed for analytics. ([cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Fee** — Fee structures and collection records for loans that are processed in DAGs and transformed for reporting. ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **Interest** — Interest accrual records and rate information for loans, calculated in DAGs and analyzed in datatools. ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **MPL** — Marketplace Lender entity with configuration for data processing, used to track relationships between loans and lenders. ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **SOFR** — SOFR rate data fetched from Federal Reserve, ingested and then used in loan calculations and processing. ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))

## Data Flows

### Loan Data Processing Pipeline

End-to-end pipeline that ingests loan data from external sources, processes it through various transformations, and prepares it for analytics

  1. Ingest raw loan data from external sources (cos-lending-selling-ingestion)
  2. Store raw data in S3 and databases
  3. Orchestrate transformation workflows via Airflow DAGs (cos-lending-selling-dags)
  4. Transform data using dbt models (cos-lending-selling-datatools)
  5. Generate analytics and reports for the lending and selling business
### SOFR Rate Processing

Pipeline for ingesting, storing, and applying SOFR rates to loan calculations

  1. Fetch SOFR rates from Federal Reserve API (cos-lending-selling-ingestion)
  2. Store rates in database
  3. Use rates in interest calculations and loan processing (cos-lending-selling-dags)
### Servicing Data Workflow

Process for handling loan servicing information to track adjusted amounts and interest payments

  1. Ingest servicing data from external sources (cos-lending-selling-ingestion)
  2. Track servicing timestamps per MPL
  3. Process servicing data through DAGs for fee collection and interest accrual (cos-lending-selling-dags)
  4. Transform for analytics and reporting (cos-lending-selling-datatools)

## Integration Points

- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** → **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** via shared-db: Raw loan, contract, and SOFR data is ingested and stored in databases which the DAGs then read from to process
- **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** → **[cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)** via shared-db: Processed loan data flows from DAG processing to data tools for transformation and analytics via shared databases
- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** → **[AWS S3](../repos/aws-s3.md)** via file: Raw data is stored in S3 buckets after ingestion for downstream processing
- **[cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)** → **[AWS S3](../repos/aws-s3.md)** via REST: Transformed data and analytics results are stored in S3 for reporting and access
- **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** → **[Vampire](../repos/vampire.md)** via database: Bidirectional data flow between DAGs and the Vampire system for loan processing

## Patterns

- **Extract-Transform-Load (ETL)** — Classic ETL pattern used throughout the cluster to ingest, process, and prepare data for analytics ([cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **Data Orchestration** — Airflow DAGs used to coordinate and schedule data processing workflows ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md))
- **Change Data Capture** — Tracking timestamps of data ingestion per MPL to identify and process only changed data ([cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Metrics Reporting** — Publishing business metrics to CloudWatch for monitoring operational performance ([cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Data Transformation** — Using dbt to model and transform data for analytics purposes ([cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))

## Open Questions

- The exact schema mapping between the different loan representations across the three repositories is undefined
- The specific business rules that govern the loan selling process in cos-lending-selling-dags are not clear
- The criteria for loan seasoning in cos-lending-selling-ingestion are not explicitly defined
- The mechanism for reconciliation between servicing data and loan data in cos-lending-selling-ingestion is unclear
- The business logic for fee calculation in cos-lending-selling-dags is not fully specified
- The exact nature of the Vampire system and its data exchange patterns with cos-lending-selling-dags is ambiguous

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-12T14:23:22.320Z*