# Loan Servicing Data Sync

## 1. Overview

The Loan Servicing Data Sync feature enables regular ingestion of loan servicing updates from Marketplace Lenders (MPLs) into the Cross River Bank Loan Selling and Servicing Platform. This feature maintains accurate and up-to-date information about loan statuses, payment activities, and other servicing-related data.

The primary purposes of this feature are to:

- Track current loan statuses (current, delinquent, charged-off, etc.)
- Record payment transactions and histories
- Synchronize servicing data between MPL systems and Cross River's platform
- Maintain accurate financial reporting and compliance records
- Enable proper fee calculations and interest accruals based on current loan status

## 2. How It Works

The Loan Servicing Data Sync operates through an automated ETL (Extract, Transform, Load) pipeline with the following flow:

1. **Data Submission**:
   - MPLs upload structured CSV files containing servicing updates to designated S3 buckets
   - Each file contains loan identifiers, status updates, payment information, and other servicing data

2. **Processing Trigger**:
   - Airflow monitors the S3 buckets for new file arrivals
   - When new files are detected, Airflow triggers the servicing data ingestion DAG

3. **Data Ingestion**:
   - The ingestion service reads the files from S3
   - Data validation and transformation occurs to standardize formats
   - Errors or anomalies are logged for resolution

4. **Database Updates**:
   - Validated servicing data is inserted or updated in the Selling Database
   - Each loan record is updated with the latest servicing information
   - Processing timestamps are recorded per MPL for auditing and reconciliation

5. **Cross-System Synchronization**:
   - Key status information is synchronized from the Arix Database
   - Data consistency checks ensure alignment across systems

The process runs on a scheduled basis (typically daily) and also supports ad-hoc processing for urgent updates.

## 3. Repos Involved

The Loan Servicing Data Sync feature is implemented across two primary repositories:

- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow DAGs that orchestrate the servicing data sync workflow, including S3 file monitoring, transformation logic, and scheduling configuration.

- [Cos.Lending.Selling.DbModel](../repos/Cos.Lending.Selling.DbModel.md): Provides the database models and context for storing and accessing the servicing data, including entity definitions and relationships.

## 4. Key APIs

This feature does not expose or consume any public APIs. It operates primarily through internal database operations and file-based data exchange.

## 5. Data Entities

The Loan Servicing Data Sync feature interacts with several key entities in the database:

- [Loan](../data-model/entities.md): The core entity that stores loan details and current status
- [Servicing](../data-model/entities.md): Records servicing-specific information and history
- [LoanEvent](../data-model/entities.md): Captures status changes and significant events in the loan lifecycle
- [Batch](../data-model/entities.md): Tracks processing batches for servicing updates
- [MPL](../data-model/entities.md): Contains marketplace lender information and configuration
- [LoanAccount](../data-model/entities.md): Links loans to their corresponding financial accounts
- [InterestHistory](../data-model/entities.md): Stores interest accrual history affected by servicing status

This data model enables comprehensive tracking of loan servicing information while maintaining relationships to other aspects of the lending platform.

---

> **Repos:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T12:36:49.789Z*