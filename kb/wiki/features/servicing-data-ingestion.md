# Servicing Data Ingestion

## Overview
The Servicing Data Ingestion feature enables the COS Lending Selling Platform to import and process loan servicing data from Marketplace Lenders (MPLs) systems. This functionality is critical for maintaining up-to-date loan information after loans have been transferred to MPL servicers. The feature processes data such as adjusted loan amounts, interest payments, and status updates from external servicing platforms, ensuring that Cross River Bank maintains accurate records of loan performance and status even after servicing rights transfer.

## How It Works

The servicing data ingestion process follows these key steps:

1. **Data Delivery**: MPLs upload CSV files containing servicing updates to designated S3 buckets
2. **Scheduled Ingestion**: Airflow DAGs orchestrate the retrieval and processing of these files on a scheduled basis
3. **Data Validation**: Files undergo validation checks for format compliance and data quality
4. **Data Transformation**: Raw servicing data is transformed into standardized formats compatible with the platform's data model
5. **System Update**: Validated and transformed data updates the loan records in the system, reflecting current status, balances, and payment information
6. **Audit Logging**: All ingestion activities are logged for compliance and troubleshooting purposes

The system processes several key data points from servicing updates:
- Current loan balances
- Interest paid since last update
- Status changes (current, delinquent, default, etc.)
- Payment history updates
- Servicing-specific identifiers and reference data

## Repos Involved

The servicing data ingestion functionality is implemented across two key repositories:

- [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md): Handles the core ingestion logic, data validation, and transformation of servicing data
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow DAGs that orchestrate the timing and sequencing of the servicing data ingestion process

## Key APIs

This feature primarily operates through batch file processing and does not expose or consume specific API endpoints. Data exchange occurs through the file-based integration with S3 buckets.

## Data Entities

The servicing data ingestion process interacts with the following entities:

- [Loan](../data-model/entities.md#loan): Updated with current balance and status information from servicers
- [LoanAction](../data-model/entities.md#loanaction): Records actions taken on loans based on servicing data
- [Interest](../data-model/entities.md#interest): Updated with interest payment information
- [Batch](../data-model/entities.md#batch): Tracks ingestion processing batches
- [MPL](../data-model/entities.md#mpl): References the servicing entity providing the data
- [Organization](../data-model/entities.md#organization): Maps to the organization context for the servicing data

The feature maintains the integrity of the platform's data model while incorporating external servicing information, enabling accurate reporting and financial operations despite distributed loan servicing.

---

> **Repos:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:25:44.399Z*