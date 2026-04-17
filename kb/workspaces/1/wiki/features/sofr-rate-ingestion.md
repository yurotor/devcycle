# SOFR Rate Ingestion

## 1. Overview

The SOFR Rate Ingestion feature automatically imports the daily Secured Overnight Financing Rate (SOFR) data from the Federal Reserve API. This data is essential for interest calculations using SOFR-based and Combined interest calculation methods within the COS Lending Selling platform.

SOFR (Secured Overnight Financing Rate) is a benchmark interest rate that serves as an alternative to LIBOR. This feature ensures that the system has up-to-date SOFR rates to accurately calculate interest for loans that use SOFR-based interest calculation methodologies.

## 2. How It Works

The SOFR Rate Ingestion operates as part of the Interest Accrual Daily Process workflow:

1. **Scheduling**: An Airflow DAG is scheduled to run daily to fetch the latest SOFR rates
2. **API Connection**: The system connects to the Federal Reserve's API endpoint
3. **Data Retrieval**: The latest SOFR rate is retrieved from the Federal Reserve's data service
4. **Data Validation**: The retrieved rate is validated to ensure it falls within expected parameters
5. **Database Storage**: The validated SOFR rate is stored in the system database for use in interest calculations
6. **Failure Handling**: If the API call fails or returns invalid data, the system logs the error and sends alerts to administrators

Once ingested, the SOFR rates become available for:
- SOFR-based interest calculations
- Combined interest calculation methods that incorporate SOFR
- Historical interest rate reporting and analysis

## 3. Repos Involved

The SOFR Rate Ingestion feature is implemented across two repositories:

- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow DAG definitions that schedule and orchestrate the SOFR rate ingestion process as part of the Interest Accrual Daily Process
- [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md): Handles the actual data ingestion process, API connection, and data transformation

## 4. Key APIs

This feature doesn't expose any internal APIs, but it consumes the following external API:

- **Federal Reserve API**: Used to retrieve the daily SOFR rates
  - Endpoint: Federal Reserve Bank of New York's SOFR data service
  - Authentication: API key-based authentication
  - Format: JSON response containing date and rate information

## 5. Data Entities

The SOFR Rate Ingestion process interacts with the following data entities:

- [Interest](../data-model/entities.md): The Interest entity stores rate information and provides the foundation for interest calculations, including SOFR-based methods
- [Loan](../data-model/entities.md): Loans can be configured to use SOFR-based interest calculation methods
- [Account](../data-model/entities.md): Account balances may accrue interest based on SOFR rates

The daily SOFR rate data is stored in a dedicated table that maintains a historical record of rates by date, which is then referenced during interest accrual calculations.

---

> **Repos:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:59:34.428Z*