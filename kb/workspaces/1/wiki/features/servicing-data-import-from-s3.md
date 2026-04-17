# Servicing Data Import from S3

## 1. Overview

The Servicing Data Import from S3 feature enables the COS Lending Selling platform to ingest and process loan servicing data files uploaded by Marketplace Lenders (MPLs). This feature is critical for maintaining up-to-date loan information after loans have been purchased and are being serviced. The system processes CSV files containing important servicing updates such as adjusted loan balances and interest payment information, allowing Cross River Bank and investors to maintain accurate records of their loan portfolios.

The primary purpose of this feature is to:
- Automate the ingestion of servicing data from multiple MPLs
- Apply servicing updates to loan records in the system
- Track ingestion activity with timestamps for each MPL
- Ensure data consistency between MPL servicing systems and the COS platform

## 2. How It Works

The servicing data import follows this technical flow:

1. **File Upload**: MPLs upload CSV files containing loan servicing data to designated S3 buckets
2. **Triggering**: Airflow DAGs in the [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) repository detect new file uploads and initiate the processing workflow
3. **File Validation**: The system validates the CSV structure and required fields
4. **Data Transformation**: Raw servicing data is transformed into the system's internal data model
5. **Loan Updates**: The system applies updates to the corresponding loan records:
   - Adjusted principal balances
   - Interest paid records
   - Any servicing status changes
6. **Ingestion Logging**: Each successful file ingestion is logged with a timestamp linked to the corresponding MPL
7. **Error Handling**: Failed imports are logged and notifications are sent to system administrators

The system processes files in batch mode, allowing for efficient handling of large servicing data files that may contain thousands of loan records.

## 3. Repos Involved

- [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md): Handles the initial S3 file detection and raw data extraction
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow DAGs that orchestrate the servicing data ingestion workflow, including transformation and data loading steps
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the database models and context for persisting the updated loan servicing information

## 4. Key APIs

This feature primarily operates through internal workflows and does not expose dedicated external APIs. All interactions with the feature are handled through S3 file uploads and the automated DAG workflows.

## 5. Data Entities

The following key entities are involved in the servicing data import process:

- [Loan](../data-model/entities.md#loan): The core loan record that gets updated with servicing information
- [Interest](../data-model/entities.md#interest): Tracks interest payments and calculations
- [InterestHistory](../data-model/entities.md#interesthistory): Historical record of interest calculations and payments
- [Servicing](../data-model/entities.md#servicing): Contains servicing-specific data and status information
- [MPL](../data-model/entities.md#mpl): Marketplace Lender entity that provides the servicing data
- [Batch](../data-model/entities.md#batch): Represents a group of processed servicing records from a single file import
- [LoanEvent](../data-model/entities.md#loanevent): Tracks significant events in a loan's lifecycle, including servicing updates

The servicing data import maintains the integrity of these entities by applying changes in the proper sequence and ensuring data consistency across related tables in the database.

---

> **Repos:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:57:27.990Z*