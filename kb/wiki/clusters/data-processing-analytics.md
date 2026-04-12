# Data Processing & Analytics

## Shared Entities

- **Loan** — Core loan data entity representing loan contracts, statuses, and sale information flowing from ingestion to processing and analytics ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Contract** — Agreement terms between CRB and partners with effective dates, ingested and transformed for analytics ([cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Fee** — Fee structures and parameters for loans used in collection processing and analytics ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **Interest** — Interest rate information and accrual records for loan processing and analysis ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **MPL** — Marketplace Lender entities with configuration for data processing and orchestration ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))

## Data Flows

### Loan Data Processing Pipeline

End-to-end flow from raw loan data ingestion to analytics-ready transformed data

  1. Ingest loan data from external sources via cos-lending-selling-ingestion
  2. Store raw data in S3/warehouse
  3. Trigger processing DAGs in cos-lending-selling-dags
  4. Transform data using DBT in cos-lending-selling-datatools
  5. Make data available for analytics and reporting
### SOFR Rate Processing

Fetching and integrating SOFR rates for loan interest calculations

  1. Fetch SOFR rates from Federal Reserve API via cos-lending-selling-ingestion
  2. Store rates in database
  3. Process rates in conjunction with loan data using DAGs
  4. Apply to interest accrual calculations
### Servicing Data Integration

Processing of loan servicing information for analytics and operations

  1. Ingest servicing data files from S3 via cos-lending-selling-ingestion
  2. Process and store ServicingValue entities
  3. Orchestrate data processing via Airflow DAGs
  4. Transform for analytics consumption

## Integration Points

- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** → **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** via shared-db: Raw ingested loan, contract, and SOFR data stored in databases for DAG processing
- **[cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)** → **[cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)** via orchestration: DAGs trigger and orchestrate data transformation processes defined in datatools
- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** → **[AWS S3](../repos/aws-s3.md)** via file-storage: Raw servicing data stored in S3 buckets for further processing
- **[cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)** → **[postgres-warehouse](../repos/postgres-warehouse.md)** via database: Transformed data stored in PostgreSQL warehouse for analytics consumption

## Patterns

- **ETL Pipeline** — Extract-Transform-Load pattern used to process financial data from raw sources to analytics-ready formats ([cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **Workflow Orchestration** — Airflow DAGs used to coordinate complex data processing workflows and dependencies ([cos-lending-selling-dags](../repos/cos-lending-selling-dags.md))
- **Data Warehouse** — Centralized repository pattern for transformed data ready for analytics and reporting ([cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md))
- **Change Data Capture** — Tracking changes to data through timestamps to ensure incremental processing ([cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))

## Open Questions

- The specific schema mappings between ServicingValue in cos-lending-selling-ingestion and the Loan entity in cos-lending-selling-dags
- The exact trigger mechanisms between completed ingestion in cos-lending-selling-ingestion and DAG execution in cos-lending-selling-dags
- The precise nature of the bidirectional Vampire integration referenced in cos-lending-selling-dags and how it relates to the other repos
- How the MplBootstrapping configuration in cos-lending-selling-ingestion affects processing in the other repositories

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-12T14:23:22.320Z*