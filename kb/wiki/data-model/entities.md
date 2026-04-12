# Data Model

Consolidated data entities across the system.

### Loan

Core entity representing a consumer loan with loan_id, loan_number, mpl_id, issuing_bank_id, servicing_bank_id, investor_id, loan_type, loan_amount, interest_rate, status, origination_date, maturity_date, and sale_date. Tracks the complete loan lifecycle from origination through sale and servicing.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Contract

Defines legal and financial terms between Cross River Bank and MPLs, including fee structures (servicing fees, volume fees, interest calculations), seasoning periods, auto-purchase rules, and effective date ranges. Represents the master agreement governing loan transactions.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### LoanAction

Audit trail of actions performed on loans including purchases, status changes, interest accruals, fee collections, and loan type changes. Each action has action_type, action_date, amount, and references to related entities. Provides complete history for regulatory compliance.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Transfer

Represents financial transfers between accounts with transfer_type (purchase, interest, fee), amount, source_account, destination_account, status (pending, completed, failed), and external_transfer_id. Links loan operations to actual money movement via COS Transaction Service.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Account

Financial account entity with account_number, account_type, owner (MPL, Bank, or Investor), and purpose/objective (purchase, return, interest income, interest expense, fee income, fee sweep). Maps loans to specific GL accounts for accounting.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Batch

Groups multiple loans for bulk purchase processing with batch_id, mpl_id, batch_date, status, total_amount, loan_count, and progress tracking. Enables atomic multi-loan transactions with rollback capabilities.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### InterestHistory

Time-series record of interest calculations with loan_id, calculation_date, principal_balance, interest_rate, SOFR_rate (if applicable), daily_interest_amount, and cumulative_interest. Supports pass-through interest to investors and regulatory reporting.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
### Fee

Fee configuration and collection records with fee_type (servicing, volume, origination), rate/amount, collection_frequency, mpl_id, contract_id, and calculation_method. Supports both fixed and percentage-based fees with minimum thresholds.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Investor

Entity representing organizations that purchase loan participation interests, with investor_id, name, account configurations, and allocation rules. Investors receive pass-through interest and may have specific loan type preferences.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### MPL (Marketplace Lender)

Marketplace lending platform entity with mpl_id, name, contract references, account configurations, and auto-purchase settings. MPLs originate loans through issuing banks and purchase them through the platform.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Bank

Financial institution entity (issuing or servicing banks) with bank_id, name, and account configurations. Issuing banks originate loans on behalf of MPLs, while servicing banks handle ongoing loan administration.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### ChatSession

Represents conversation sessions for querying loan history within the UI

**Defined in:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
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

*Generated: 2026-04-12T14:26:15.921Z*