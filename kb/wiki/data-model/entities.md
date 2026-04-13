# Data Model

Consolidated data entities across the system.

### Loan

Core entity representing a consumer loan. Contains loan_id, loan_number, mpl_id, issuing_bank_id, investor_id, loan_type, loan_amount, interest_rate, origination_date, purchase_date, sale_status, and borrower PII. Central to all operations.

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Contract

Defines legal and financial terms between Cross River Bank and MPLs (Marketplace Lenders). Includes fee structures, interest calculation methods, volume fee tiers, seasoning periods, and purchase criteria.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Account

Financial accounts used for transfers. Includes account_number, account_type, balance, and ownership (MPL, Bank, Investor). Links to LoanAccount for loan-specific account mappings.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Transfer

Represents money movements between accounts. Includes transfer_id, source_account, destination_account, amount, transfer_type (purchase, interest, fee), status, and timestamps. Core to financial operations.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### LoanAction

Audit log of actions performed on loans including purchases, interest calculations, fee collections, grooming operations, and status changes.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Batch

Groups multiple loans for bulk processing during purchase operations. Tracks batch_id, status, initiated_date, completed_date, and summary totals.

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Fee

Various fees associated with loan operations including DMV fees, Florida Stamp Tax, Loan Payoff Shortfall, Merchant Fees, and Volume Fees. Links to Contract for fee configuration.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)
### InterestHistory

Tracks daily interest accruals on sold loans including calculated_interest, accrual_date, interest_rate used, day_count_convention, and payment status.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### Investor

Organizations that purchase loans from Cross River Bank. Contains investor_id, name, and account relationships.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### MPL (Marketplace Lender)

Lending platforms that originate loans sold to investors. Identified by mpl_id with associated contracts and account configurations.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### PendingApproval

Represents loans awaiting approval for grooming operations (investor changes or loan type changes). Contains approval workflow state.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
### GroomingProcess

Tracks the workflow and state transitions for loan grooming operations including recovery requests and responses.

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
### LoanAccount

Maps loans to specific financial accounts with designated objectives (purchase, return, interest income, fee collection).

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Discrepancy

Tracks differences between loan values across systems (e.g., Arix vs. Selling DB) for reconciliation purposes.

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### TrueUpVolumeFee

Represents adjustments to volume fees charged to MPLs based on actual loan purchase volumes vs. contracted minimums.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### ChatSession

Represents a conversation session between a user and the AI system about a specific loan, stored in DynamoDB.

**Defined in:** [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
### ServicingValues

Loan servicing data from MPLs including adjusted_loan_amount and interest_paid, ingested from CSV files.

**Defined in:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### Bank

Financial institution that originates or services loans, defined in Contracts and stored in DbModel

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
### Mpl

Marketplace lender entity that purchases loans from banks, defined in Contracts and stored in DbModel

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
### Interest

Interest accrual records and rate information used in calculations and reporting.

**Defined in:** [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)
### ServicingValue

Loan servicing data including adjusted loan amounts and interest paid, ingested and then processed by DAGs.

**Defined in:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### SOFR

SOFR rates ingested from Federal Reserve API and used in interest calculations.

**Defined in:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### AccountConfig

Configuration for accounts used for various financial operations

**Defined in:** [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)
### Aurora PostgreSQL Database

Main database provisioned by IaC and used by e2e tests for validation scenarios

**Defined in:** [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### LoanSaleStatus

Tracks the sale status of loans, ingested by the ingestion service and published as events by hooks

**Defined in:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
### LoanSaleStatusChanged

Represents loan sale status changes that are captured and published as notifications

**Defined in:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
### BatchPurchaseCompleted

Represents completed batch purchases with financial summaries that are published to notification subscribers

**Defined in:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
### TrueUpVolumeFeeCharged

Represents fee charges that are published as notifications for accounting and reconciliation purposes

**Defined in:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
### InvestorChanged

Represents investor reassignments that are published to notification subscribers

**Defined in:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
### LoanTypeChanged

Represents loan type modifications that are published to notification subscribers

**Defined in:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
### OverdueLoansAlert

Represents alerts about overdue loans that are published to notification subscribers

**Defined in:** [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
### Session

Represents chat sessions between users and AI about specific loans, maintained in AI service but accessed via UI

**Defined in:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
### Message

Chat messages exchanged between users and AI assistant, created in AI service and displayed in UI

**Defined in:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-13T06:20:47.564Z*