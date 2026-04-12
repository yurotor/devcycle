# Fee Collection and Management

## 1. Overview

The Fee Collection and Management feature automates the calculation, billing, and collection of various fees between Cross River Bank and Marketplace Lenders (MPLs) within the COS Lending Selling Platform. The feature supports configurable fee structures including servicing fees, volume fees, and origination fees, ensuring accurate revenue recognition and financial operations between the bank and its MPL partners.

This feature exists to:
- Automate the billing cycle for different fee types
- Ensure contractual fee obligations are met
- Handle monthly minimum guarantees and true-up processes
- Provide transparency in fee calculations

## 2. How It Works

### Fee Types and Calculation
- **Servicing Fees**: Calculated as a percentage of outstanding loan balances for loans being serviced
- **Volume Fees**: Applied based on the total volume of loans purchased within a period
- **Origination Fees**: One-time fees charged when a loan is originated

### Processing Flow
1. **Fee Configuration**: Fee structures are defined at the contract level between Cross River Bank and each MPL
2. **Daily Calculation**: The system calculates applicable fees on a daily basis
3. **Monthly Aggregation**: At month-end, fees are aggregated and compared against monthly minimums
4. **True-Up Processing**: When volume thresholds aren't met, the system automatically calculates the difference and processes a true-up fee to meet the contractual minimum
5. **Fee Collection**: Fees are either collected via ACH transactions or internal account transfers
6. **Reporting**: Fee collections and calculations are recorded for accounting and reporting purposes

### Monthly Minimum Processing
1. The system tracks accumulated volume fees during the month
2. At month-end, it compares the total to the contracted monthly minimum
3. If the total is below the minimum, a true-up fee is calculated (minimum - collected fees)
4. The true-up fee is processed to ensure the minimum obligation is met

## 3. Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Implements the fee calculation logic, API endpoints for fee management, and data persistence
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains Airflow DAGs that orchestrate the scheduled execution of fee calculations, month-end processing, and true-up operations

## 4. Key APIs

- `GET /api/fees`: Retrieves fee information for a specific period or MPL
- `GET /api/fees/{id}`: Gets details for a specific fee record
- `POST /api/fees/calculate`: Triggers manual fee calculation for testing or reconciliation
- `GET /api/reports/fees`: Generates fee reports for accounting and reconciliation
- `POST /api/transfers`: Used to initiate fee collection transfers between accounts

## 5. Data Entities

- [Account](../data-model/entities.md): Represents MPL accounts where fees are collected from
- [Contract](../data-model/entities.md): Contains fee configurations, rates, and monthly minimums
- [Fee](../data-model/entities.md): Represents individual fee transactions
- [VolumeFeeMonthlyMinimum](../data-model/entities.md): Tracks monthly minimum requirements and true-up calculations
- [MPL](../data-model/entities.md): The Marketplace Lender entity that fees are associated with
- [Organization](../data-model/entities.md): Parent entity for MPL and banking relationships

The system maintains a detailed audit trail of all fee calculations and collections to support financial reconciliation and reporting requirements.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:24:30.098Z*