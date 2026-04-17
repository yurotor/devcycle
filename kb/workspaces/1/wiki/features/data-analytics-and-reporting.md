# Data Analytics and Reporting

## 1. Overview
The Data Analytics and Reporting feature provides a robust framework for transforming operational loan data from the COS Lending Selling platform into analytical models suitable for business intelligence and financial reporting. This feature enables Cross River Bank and its partners to gain insights into loan performance, fee structures, and marketplace operations through sophisticated data processing pipelines.

The system exists to satisfy critical business needs including:
- Financial reporting on loan portfolios
- Business intelligence dashboards for decision-makers
- Compliance and audit reporting requirements
- Performance analysis of marketplace lenders (MPLs) and loan programs

## 2. How It Works
The system implements ELT (Extract, Load, Transform) pipelines that process operational loan data through several stages:

1. **Data Extraction**: Raw loan data is extracted from the operational database systems
2. **Loading**: This data is loaded into staging tables in the data warehouse
3. **Transformation**: Using dbt (data build tool), the data is transformed into analytical models with appropriate aggregations, calculations, and derived metrics
4. **Data Lake Export**: Transformed data is exported to S3/Athena data lake for consumption by business intelligence tools

The process follows the "Loan Purchase End-to-End Flow" with special attention to data points needed for financial analysis, including fee calculations, interest accruals (Standard, SOFR-based, or Combined methods), and performance metrics.

Key transformations include:
- Aggregation of loan performance by MPL, program, and time periods
- Calculation of financial metrics including expected returns, fee revenue, and risk indicators
- Generation of dimension and fact tables optimized for analytical queries

## 3. Repos Involved
- [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md) - Core data engineering repository containing dbt models, Python transformation scripts, and data validation tools
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) - Airflow DAGs that orchestrate the data pipeline execution, scheduling transformation jobs and managing dependencies

## 4. Key APIs
- **POST /api/ingestion** - Initiates data ingestion processes for new loan data, triggering the beginning of the analytics pipeline

## 5. Data Entities
The analytics pipeline processes the following key entities:

- [Loan](../data-model/entities.md) - Core loan information including terms, status, and performance metrics
- [Contract](../data-model/entities.md) - Legal agreements governing loan terms
- [Fee](../data-model/entities.md) - Various fee structures applied to loans and portfolios
- [Termsheet](../data-model/entities.md) - Terms for loan purchases and sales
- [Interest](../data-model/entities.md) - Interest calculation models and accrual data
- [Seasoning](../data-model/entities.md) - Information about loan age and performance over time
- [Tiering](../data-model/entities.md) - Tier-based pricing and volume structures
- [Account](../data-model/entities.md) - Financial accounts associated with loans
- [LoanAction](../data-model/entities.md) - Events and state changes in loan lifecycle
- [Batch](../data-model/entities.md) - Grouping of loans processed together
- [MPL](../data-model/entities.md) - Marketplace lender information
- [Organization](../data-model/entities.md) - Entity information for all participants in the system

This analytical layer transforms operational data into insights that drive decision-making and financial reporting across the COS Lending Selling platform.

---

> **Repos:** [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T13:00:06.129Z*