# Batch Reporting

## Overview

The Batch Reporting feature provides automated generation of standardized reports for both pre-sale and post-sale loan activities. This functionality is crucial for:

- **Compliance**: Ensuring all loan transactions meet regulatory requirements
- **Operations**: Tracking loan performance, transfers, and status changes
- **Analysis**: Supporting business intelligence and decision-making processes
- **Transparency**: Providing MPLs and investors with required documentation

Reports can be scheduled or generated on-demand, covering various aspects of loan portfolios including origination details, transfer status, interest accruals, fee collections, and investor allocations.

## How It Works

The Batch Reporting system follows a multi-stage pipeline:

1. **Report Request**: A client submits a report request via the API, specifying report type, parameters, and output format (CSV/Excel)
2. **Queue Management**: The request is captured by the `ReportingOutbox` service which queues it for asynchronous processing
3. **Data Extraction**: Raw data is extracted from the database based on report criteria and parameters
4. **Data Transformation**: The data goes through transformation pipelines implemented as dbt models to structure it according to the report template
5. **Report Generation**: Formatted data is rendered into the requested output format (CSV/Excel)
6. **Storage**: The generated report is uploaded to S3 with appropriate access controls
7. **Notification**: A download link is returned to the requester, or notification is sent via configured channels

For recurring reports, Airflow DAGs orchestrate the scheduling and execution of this process at predetermined intervals.

## Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Provides the API endpoints for requesting reports and retrieving results
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains Airflow DAGs that orchestrate scheduled report generation
- [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md): Implements the dbt models for data transformation and report structure
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Defines the database schema from which report data is extracted

## Key APIs

- `POST /api/reports`: Creates a new report request with specified parameters
  - Parameters: `reportType`, `startDate`, `endDate`, `format`, `filters`
  - Returns: Request ID for tracking

- `GET /api/reports/{id}`: Retrieves status or download link for a requested report
  - Returns: Status ("pending", "processing", "completed", "failed") and download URL if available

- `GET /api/reports/types`: Lists available report types with parameter requirements
  - Returns: Collection of report type definitions and required/optional parameters

## Data Entities

The Batch Reporting feature interacts with numerous entities across the system:

- [Loan](../data-model/entities.md#loan): Core loan data including terms, status, and ownership
- [Batch](../data-model/entities.md#batch): Groupings of loans for processing and transfer
- [Transfer](../data-model/entities.md#transfer): Records of loan ownership changes
- [Fee](../data-model/entities.md#fee): Fee assessments and collections
- [InterestHistory](../data-model/entities.md#interesthistory): Interest accrual and payment records
- [Account](../data-model/entities.md#account): Financial accounts associated with loans
- [LoanAction](../data-model/entities.md#loanaction): History of operations performed on loans
- [Contract](../data-model/entities.md#contract): Legal agreements governing loan sales
- [Organization](../data-model/entities.md#organization): MPLs, investors, and other business entities

Each report type focuses on different subsets of these entities, transformed according to specific business requirements and compliance needs.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T12:37:41.399Z*