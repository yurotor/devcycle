# Data Model

Consolidated data entities across the system.

### Loan

Core entity representing a consumer loan with origination details, current status, sale information, investor assignment, loan type (HFS/LTHFS/RET), amounts, rates, and dates. Central to all operations across the system.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
### Contract

Agreement between Cross River Bank and MPL/Investor defining fee structures, interest calculation methods (Standard/SOFR/Combined), accrual methods, volume fee tiers, monthly minimums, and contract effective dates.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
### Transfer

Financial transaction between accounts for principal, interest (normal/retroactive/correction), volume fees, DMV fees, stamp tax, merchant fees, and other loan-related monetary movements. Tracked with COS transfer IDs for reconciliation.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
### LoanAccount

Links loans to financial accounts with specific objectives (purchase, return, interest income, principal, fee collection). Each loan has multiple accounts for different transaction types.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
### Batch

Groups multiple loans for batch purchase operations with status tracking (Open/Completed), success/failure counts, and batch-level financial summaries.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
### MPL (Marketplace Lender)

Financial institution partner that originates loans and participates in the lending marketplace. Has associated contracts, fee structures, and custom account mappings.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### Investor

Organization that purchases loans from the marketplace. Has specific account structures and contract terms.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
### Bank (Issuing Bank)

Financial institution that issues loans. Distinct from MPL in the system's data model.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
### Fee

Fee configuration and records including volume fees, DMV fees, Florida stamp tax, merchant fees, loan payoff shortfall fees with calculation methods and account mappings.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
### InterestHistory

Tracks all interest accrual events for loans including calculation method used, rate applied, amount accrued, and date range. Used for audit trail and AI queries.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)
### VolumeFeeMonthlyMinimum

Defines minimum monthly fee requirements per contract. Used for calculating true-up fees at month end.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
### TrueUpVolumeFee

Records monthly fee adjustments when actual volume fees fall short of contractual minimums.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
### GroomingProcess

Tracks loan modification operations such as loan type changes, investor changes, and associated financial adjustments (reverse interest, principal transfers).

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
### SofrRate

Secured Overnight Financing Rate values from Federal Reserve, used for interest calculations on SOFR-based and Combined interest method contracts.

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)
### ChatSession

AI conversation session linking user to loan with message history stored for context-aware responses.

**Defined in:** [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
### PendingApproval

Represents loan changes requiring approval workflows before execution.

**Defined in:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
### LoanAction

Audit trail of all actions performed on loans including transfers, status changes, interest accruals, and fee collections.

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
### Bank

Financial institution that originates or services loans, defined in Contracts and stored in DbModel

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
### Mpl

Marketplace lender entity that purchases loans from banks, defined in Contracts and stored in DbModel

**Defined in:** [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
### Account

Represents financial accounts used for transfers and operations, persisted in database and exposed through API endpoints

**Defined in:** [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
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

*Generated: 2026-04-16T13:01:33.725Z*