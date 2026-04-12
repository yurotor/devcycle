# Reconciliation and Reporting

## Overview

The Reconciliation and Reporting feature provides comprehensive data analysis capabilities for both pre-sale and post-sale activities within the COS Lending Selling Platform. This feature serves two primary purposes:

1. **Regulatory Compliance**: Generates standardized reports required by regulatory bodies to ensure all loan sales and transfers comply with applicable financial regulations.

2. **Business Intelligence**: Delivers actionable insights into loan performance, sales metrics, and market trends to support data-driven decision making.

The system automatically tracks discrepancies between various components of the lending platform, ensuring data consistency across all systems. Reports and reconciliation data are exported to Amazon S3 buckets, making them available for consumption by downstream analytics systems and business users.

## How It Works

The Reconciliation and Reporting feature operates through a multi-stage process:

1. **Data Collection**: 
   - Raw loan data is collected from multiple sources including the core lending platform, servicing systems, and third-party integrations
   - The system maintains a historical record of all loan activities and transactions

2. **Processing Pipeline**:
   - Airflow DAGs orchestrate the ETL workflows for report generation
   - DBT transformations standardize and prepare data for analysis
   - Reconciliation processes compare data across systems to identify discrepancies

3. **Report Generation**:
   - Pre-built report templates are populated with processed data
   - Reports are generated on scheduled intervals or on-demand
   - Formats include CSV, Excel, PDF, and JSON

4. **Data Export & Storage**:
   - Completed reports are stored in S3 buckets with appropriate access controls
   - Metadata is maintained to enable easy searching and retrieval
   - Historical reports are archived according to retention policies

5. **Discrepancy Handling**:
   - Automated alerts notify appropriate teams of data inconsistencies
   - Reconciliation tools help identify root causes of discrepancies
   - Resolution workflows guide the correction process

## Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Provides REST endpoints for report generation and retrieval, handles user authentication and authorization for report access.

- [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md): Contains the core ETL processes, DBT models, and data transformation logic needed to prepare data for reporting.

- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Houses the Airflow DAGs that orchestrate the execution of reporting workflows and schedule recurring reports.

## Key APIs

**Report Generation and Retrieval:**
- `POST /api/reports` - Initiates generation of a new report based on specified parameters
- `GET /api/loans` - Retrieves loan data for reporting purposes
- `GET /api/loans/{id}` - Fetches detailed information about a specific loan
- `GET /api/batches` - Retrieves batch information for reconciliation
- `POST /api/transfers` - Records loan transfers for reporting

**Data Ingestion:**
- `POST /api/ingestion` - Triggers data ingestion processes for reporting purposes

## Data Entities

The following entities are central to the Reconciliation and Reporting feature:

- [Loan](../data-model/entities.md) - Core loan data including status, terms, and performance metrics
- [LoanAction](../data-model/entities.md) - Records of activities performed on loans
- [Transfer](../data-model/entities.md) - Details of loan ownership transfers between parties
- [Batch](../data-model/entities.md) - Groups of loans processed together
- [Contract](../data-model/entities.md) - Legal agreements governing loan sales
- [Account](../data-model/entities.md) - Financial accounts associated with loans and parties
- [Fee](../data-model/entities.md) - Fee structures and transactions
- [Interest](../data-model/entities.md) / [InterestHistory](../data-model/entities.md) - Interest accrual records
- [Organization](../data-model/entities.md) / [MPL](../data-model/entities.md) - Details about participating organizations

The reporting system leverages relationships between these entities to generate comprehensive views of the lending and selling operations.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:26:00.619Z*