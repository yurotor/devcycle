# Data Model

Consolidated data entities across the system.

### Loan

Core entity representing consumer loan with loan_id, loan_number, loan_type, loan_amount, interest_rate, status, mpl_id, issuing_bank_id, servicing_bank_id, investor_id, origination_date, maturity_date

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Contract

Agreement between MPL and bank defining purchase terms, fees, interest calculation methods, seasoning periods, volume minimums

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Batch

Group of loans processed together with batch_id, status, creation_date, mpl_id, total_amount, loan_count, progress statistics

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Transfer

Financial transaction between accounts with transfer_id, amount, from_account, to_account, status, type, loan_id, created_date

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### LoanAction

Audit trail of actions on loans (purchase, interest_accrual, fee_collection) with action_type, amount, timestamp, user_id

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### InterestHistory

Interest calculations over time with interest_date, principal_balance, interest_rate, sofr_rate, interest_amount, loan_id

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)
### Fee

Fee structures and charges with fee_type, amount, percentage, frequency, mpl_id, contract_id, collection_date

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)
### Account

Banking accounts for transfers with account_number, account_type, is_subaccount, objective (purchase/return/interest/fee), mpl_id

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Mpl (Marketplace Lender)

Partner organizations purchasing loans with mpl_id, name, enabled status, contract terms

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
### Investor

Organizations investing in loan portfolios with investor_id, name, allocation rules

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
### Bank

Financial institutions (issuing or servicing) with bank_id, name, type

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
### SofrRate

Secured Overnight Financing Rate with rate_date, rate_value, 30day_average from Federal Reserve

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### ServicingValues

MPL-provided loan servicing data with adjusted_loan_amount, interest_paid, last_payment_date, servicing_timestamp

**Defined in:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### ChatSession

AI chat conversation with session_id, user_id, loan_id, created_date, last_activity

**Defined in:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
### VolumeFeeMonthlyMinimum

Monthly fee minimums per MPL with month, year, minimum_amount, actual_amount, true_up_amount

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
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
### LoanAccount

Account mappings for loans that are created by data-utils and validated in e2e tests

**Defined in:** [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)
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

*Generated: 2026-04-12T12:37:55.010Z*