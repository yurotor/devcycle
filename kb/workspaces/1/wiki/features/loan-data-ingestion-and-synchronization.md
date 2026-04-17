# Loan Data Ingestion and Synchronization

## Overview

The Loan Data Ingestion and Synchronization feature provides continuous synchronization of loan data from external source systems (Arix MSSQL and Contracts DB) into the Selling PostgreSQL database. This feature is essential for maintaining an up-to-date view of all loans in the system, enabling accurate loan status reconciliation and ensuring loans are ready for purchase operations.

This process forms the foundation of the loan lifecycle management within the COS Lending Selling platform, serving as the entry point for all loan data that will be processed through the system's purchase and servicing workflows.

## How It Works

The synchronization process follows these key steps:

1. **Data Extraction**: Scheduled Airflow DAGs extract loan data from the source systems:
   - Arix MSSQL database (primary loan origination system)
   - Contracts DB (contractual details and terms)

2. **Transformation & Validation**:
   - Loan data is normalized to conform to the Selling database schema
   - Business validation rules are applied to ensure data integrity
   - Loan statuses are standardized across systems

3. **Reconciliation Process**:
   - Existing loans in the Selling database are matched with source system data
   - Status discrepancies are identified and resolved
   - New loans are flagged for ingestion

4. **Synchronization**:
   - New loans are inserted into the Selling database
   - Existing loans are updated with the latest information
   - Loan purchase readiness flags are set based on validation criteria

5. **Monitoring & Reporting**:
   - Sync operations are logged for audit purposes
   - Failed synchronizations are flagged for review
   - Data quality metrics are collected

The synchronization runs on a scheduled basis to ensure the Selling database maintains an accurate reflection of the source systems with minimal latency.

## Repos Involved

The loan data ingestion and synchronization feature is implemented across two main repositories:

- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) - Contains the Airflow DAGs that orchestrate the extraction, transformation, and loading of loan data from source systems. These DAGs manage the scheduling and execution of the synchronization workflows.

- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Defines the database schema, entity models, and relationships that support the persistence of synchronized loan data.

## Key APIs

This feature primarily operates through scheduled data processing workflows rather than APIs. The data synchronization is managed through Airflow DAGs and direct database operations.

## Data Entities

The key entities involved in the loan data ingestion and synchronization process are:

- [Loan](../data-model/entities.md#loan) - The core entity representing loan information
- [Account](../data-model/entities.md#account) - Associated account information for the loan
- [Contract](../data-model/entities.md#contract) - Contractual terms and agreements
- [LoanEvent](../data-model/entities.md#loanevent) - Records state transitions and actions on loans
- [Batch](../data-model/entities.md#batch) - Groups loans for processing
- [MPL](../data-model/entities.md#mpl) (Marketplace Lender) - Information about the originating lender
- [Organization](../data-model/entities.md#organization) - Organizational structure information
- [LoanAccount](../data-model/entities.md#loanaccount) - Maps the relationship between loans and accounts

The synchronized loan data serves as the foundation for downstream processes in the loan purchase end-to-end flow, including interest calculations, fee collections, and servicing operations.

---

> **Repos:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:57:08.490Z*