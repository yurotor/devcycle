# Daily Interest Accrual

## Overview

The Daily Interest Accrual feature automatically calculates and applies interest charges to purchased loans within the COS Lending Selling platform. This core financial operation ensures that all stakeholders—Cross River Bank, marketplace lenders (MPLs), and investors—receive the appropriate interest payments according to their contractual agreements.

Interest accrual is critical for:
- Maintaining accurate financial accounting of loan portfolios
- Supporting transparent financial reporting for all parties
- Ensuring timely and accurate interest disbursements
- Complying with financial regulations and contractual obligations

The system supports multiple calculation methods:
- **Standard**: Fixed-rate interest calculation
- **SOFR-based**: Variable rate tied to Secured Overnight Financing Rate
- **Combined**: A hybrid approach using both methods

## How It Works

The Daily Interest Accrual process runs as a scheduled daily workflow:

1. **Loan Selection**: Identifies all active purchased loans requiring interest accrual
2. **Method Determination**: For each loan, retrieves the applicable interest calculation method from the associated contract
3. **Rate Application**: Applies the appropriate rate based on the calculation method:
   - Standard: Uses fixed contract rate
   - SOFR-based: Retrieves current SOFR rate and adds the contract spread
   - Combined: Uses a combination of fixed and variable components
4. **Calculation**: Computes daily interest based on:
   - Outstanding principal balance
   - Applicable interest rate
   - Day count convention specified in the contract
5. **Recording**: Creates `InterestHistory` records for each loan's daily accrual
6. **Financial Transfer**: Generates appropriate accounting entries and transfers funds between accounts
7. **Exception Handling**:
   - Performs retroactive adjustments when rates change
   - Handles corrections for previously miscalculated interest
   - Manages edge cases like leap years and partial periods

The process is idempotent, ensuring that running it multiple times for the same day won't create duplicate accruals.

## Repos Involved

The Daily Interest Accrual feature is implemented across multiple repositories:

- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow DAG that orchestrates the daily interest accrual process, including task definitions, scheduling, and error handling
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the data models and database context used to read loan and contract information and write interest accrual records

## Key APIs

The feature primarily operates through scheduled batch processing rather than API endpoints.

## Data Entities

The following entities are central to the Daily Interest Accrual feature:

- [Loan](../data-model/entities.md#loan): The loan on which interest accrues
- [Contract](../data-model/entities.md#contract): Contains the interest terms and calculation method
- [Account](../data-model/entities.md#account): Source and destination accounts for interest transfers
- [InterestHistory](../data-model/entities.md#interesthistory): Records of daily accruals
- [Transfer](../data-model/entities.md#transfer): Financial movements between accounts
- [Investor](../data-model/entities.md#investor): Party receiving interest payments
- [MPL](../data-model/entities.md#mpl): Marketplace lender associated with the loan
- [LoanAccount](../data-model/entities.md#loanaccount): Maps loans to their associated accounts
- [Batch](../data-model/entities.md#batch): Groups related interest accrual operations

The system maintains a complete audit trail of all interest calculations and financial transfers to support reconciliation and compliance requirements.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:56:19.247Z*