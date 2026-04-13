# Data Warehouse and Analytics Pipeline

## Overview

The Data Warehouse and Analytics Pipeline is a comprehensive Extract, Load, Transform (ELT) system that centralizes loan and financial data from various source systems into a PostgreSQL data warehouse. The pipeline transforms raw data into analytics-ready datasets that support business intelligence tools, reporting, and data-driven decision making.

This feature exists to:
- Provide a single source of truth for loan and financial data
- Enable complex analytics across the lending and selling platform
- Support business intelligence and reporting requirements
- Facilitate data-driven decision making for loan selling operations

## How It Works

The pipeline follows an ELT (Extract, Load, Transform) approach:

1. **Extract**: Data is extracted from source systems via scheduled Airflow DAGs. These DAGs pull data from operational databases, APIs, and file-based sources.

2. **Load**: Raw data is loaded into staging tables in the PostgreSQL data warehouse, preserving the source format.

3. **Transform**: Using dbt (data build tool), the raw data undergoes transformation including:
   - Data cleaning and validation
   - Business logic application
   - Dimensional modeling
   - Creation of aggregated metrics
   - Building of analytical views

4. **Orchestration**: Airflow manages the entire workflow, handling scheduling, dependencies, and error handling.

The data flow typically follows this pattern:
1. Source system data → Ingestion API/direct extraction
2. Raw data → PostgreSQL staging tables
3. Staging tables → dbt transformations
4. Transformed data → Analytical models/views
5. Analytical data → BI tools and reporting interfaces

## Repos Involved

- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow DAGs that orchestrate the entire data pipeline, including extraction from source systems, workflow management, and scheduling.

- [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md): Houses the dbt models, transformation logic, and data engineering utilities that convert raw data into analytics-ready formats.

- [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md): Handles the initial data extraction and ingestion processes from source systems into the data pipeline.

## Key APIs

- **POST /api/ingestion**: Provided by the datatools repository, this endpoint allows external systems to push data directly into the ingestion pipeline, supporting both scheduled and event-based data flows.

## Data Entities

The warehouse contains and transforms data for several key entities:

- [Loan](../data-model/entities.md): Core entity containing loan details, statuses, and performance metrics
- [Account](../data-model/entities.md): Information about borrower accounts
- [Fee](../data-model/entities.md): Fee collection data related to loans
- [LoanAction](../data-model/entities.md): History of actions performed on loans
- [Batch](../data-model/entities.md): Loan batch processing information
- [MPL](../data-model/entities.md): Marketplace Lender data
- [Organization](../data-model/entities.md): Information about organizations in the system
- [Interest](../data-model/entities.md): Interest accrual and calculation data
- [Contract](../data-model/entities.md): Loan contract information
- [Termsheet](../data-model/entities.md): Details of loan sale terms
- [Seasoning](../data-model/entities.md): Loan seasoning information
- [Tiering](../data-model/entities.md): Tier-based pricing and classification data

These entities are modeled in various stages of transformation to support different analytical needs, from transaction-level details to aggregate reporting.

---

> **Repos:** [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md) | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:20:47.563Z*