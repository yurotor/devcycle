# Reporting and Analytics

## 1. Overview

The Reporting and Analytics feature provides comprehensive visibility into the loan selling lifecycle for Cross River Bank, Marketplace Lenders (MPLs), and internal stakeholders. This feature serves multiple critical business functions:

- **Pre-sale Reporting**: Provides insights into loan pools before purchase decisions are made
- **Post-sale Analytics**: Tracks performance of purchased loans and portfolio health
- **Operational Visibility**: Gives stakeholders visibility into loan volumes, purchase activities, and financial metrics
- **Compliance Support**: Helps ensure all transactions meet regulatory requirements through auditable reports

The system generates standardized and customizable reports that support data-driven decision-making across the lending ecosystem while providing MPL-specific outputs tailored to each partner's needs.

## 2. How It Works

The Reporting and Analytics system follows a data pipeline architecture:

1. **Data Collection**: Raw transaction and loan data is collected from the primary operational databases
2. **ETL Processing**: 
   - Airflow DAGs orchestrate the extraction, transformation, and loading of data
   - Data is processed through dbt models to create standardized reporting views
   - Calculations for metrics like volume totals, fee accumulation, and interest accrual are performed

3. **Report Generation**:
   - Scheduled batch reports are generated nightly
   - On-demand reports can be triggered via API endpoints
   - Reports are delivered in various formats (CSV, Excel, PDF, JSON)

4. **Data Access**:
   - Internal users access reports through dashboard interfaces
   - MPLs receive reports via API or scheduled deliveries
   - Permissioned access ensures data is only available to authorized users

## 3. Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Provides API endpoints for requesting and retrieving reports
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) - Contains Airflow DAGs that orchestrate the data extraction and report generation processes
- [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md) - Houses dbt models and Python scripts that transform raw data into reporting-ready datasets
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Defines the database schema that reporting queries are based on

## 4. Key APIs

The following endpoints support reporting functionality:

- `GET /api/reports/loan-purchase` - Retrieves loan purchase reports within a date range
- `GET /api/reports/volume` - Provides volume metrics by MPL, time period, and loan type
- `POST /api/reports/custom` - Generates custom reports based on provided parameters
- `GET /api/reports/mpl/{mplId}` - Retrieves MPL-specific reporting data
- `POST /api/ingestion` - Triggers data ingestion for report generation

## 5. Data Entities

The reporting system utilizes the following core entities:

- [Loan](../data-model/loan.md) - Core entity containing loan details used in most reports
- [Batch](../data-model/batch.md) - Groups loans purchased together for batch-level reporting
- [MPL](../data-model/mpl.md) - Marketplace lenders for partner-specific reporting
- [Fee](../data-model/fee.md) - Fee structures and collections reported on financial statements
- [Interest](../data-model/interest.md) - Interest accruals and payments for financial reporting
- [Account](../data-model/account.md) - Financial accounts involved in loan transactions
- [Transfer](../data-model/transfer.md) - Money movement records for reconciliation reporting
- [LoanEvent](../data-model/loan-event.md) - Timeline events for audit and status reporting

The reporting system maintains a separation between operational data and analytical views to ensure reporting queries don't impact transaction processing performance.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:20:06.223Z*