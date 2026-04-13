# Servicing Data Ingestion and Reconciliation

## 1. Overview

The Servicing Data Ingestion and Reconciliation feature enables the regular integration of loan servicing data from Marketplace Lender (MPL) partners into the COS Lending Selling platform. This feature serves several critical business purposes:

- **Data Synchronization**: Ensures loan servicing information remains consistent between Arix and the Selling database
- **Discrepancy Identification**: Automatically detects and flags inconsistencies between servicing data sources
- **Data Freshness Tracking**: Monitors when servicing data was last updated to ensure timely decision-making
- **Regulatory Compliance**: Maintains accurate loan records required for regulatory reporting

The feature processes standardized CSV files deposited by MPLs to an S3 bucket, transforming this external data into the system's internal data model.

## 2. How It Works

The Servicing Data Ingestion and Reconciliation operates through an orchestrated data pipeline:

1. **Data Collection**:
   - MPL partners upload standardized CSV files containing loan servicing data to designated S3 buckets
   - Files follow a predetermined naming convention and schema

2. **Ingestion Process**:
   - Airflow DAGs in [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) schedule and trigger ingestion jobs
   - The system validates incoming file formats and data integrity
   - Validated data is extracted and transformed into the internal data model

3. **Reconciliation Logic**:
   - The system compares newly ingested servicing data against existing records in the Selling database
   - Discrepancies are identified based on predefined matching rules and thresholds
   - Reconciliation reports are generated highlighting matches, mismatches, and missing records

4. **Data Update Flow**:
   - Confirmed data is used to update loan records in the Selling database
   - Historical servicing data snapshots are preserved for audit and analysis purposes
   - Data freshness metrics are updated to track the currency of servicing information

5. **Exception Handling**:
   - Files with critical errors are quarantined for review
   - Notification alerts are sent for manual intervention when needed
   - Automatic retry logic handles transient failures

## 3. Repos Involved

Two primary repositories handle the servicing data ingestion and reconciliation:

- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) - Contains the Airflow DAGs that orchestrate the entire workflow, including scheduling, file detection, transformation logic, and reconciliation processes
  
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Provides the database context and entity models used to persist the ingested and reconciled servicing data

## 4. Key APIs

This feature primarily operates as a back-end data processing pipeline and does not expose dedicated APIs.

## 5. Data Entities

The servicing data ingestion and reconciliation feature interacts with several key entities:

- [Loan](../data-model/entities.md) - The core entity representing loans being serviced
- [LoanAccount](../data-model/entities.md) - Tracks the financial state of loans
- [Servicing](../data-model/entities.md) - Contains servicing-specific data
- [Batch](../data-model/entities.md) - Groups related servicing data updates
- [MPL](../data-model/entities.md) - Represents the Marketplace Lenders providing servicing data
- [LoanEvent](../data-model/entities.md) - Tracks significant events in a loan's lifecycle
- [Organization](../data-model/entities.md) - Represents the organizational structure of servicing entities

The reconciliation process heavily relies on these entities to maintain data consistency and track changes over time.

---

> **Repos:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:19:11.824Z*