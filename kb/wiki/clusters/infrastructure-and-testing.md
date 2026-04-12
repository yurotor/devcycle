# Infrastructure and Testing

## Shared Entities

- **Loan** — Core entity representing loan data with attributes like loan_id, mpl_id, and loan_type; e2e-tests use it for simulation while data-utils maps it to accounts ([cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))
- **LoanAccount** — Maps loans to financial accounts; defined in data-utils and verified in e2e tests ([cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))
- **AccountConfig** — Configuration of accounts used for financial operations; data-utils resolves them while e2e-tests validates their behavior ([cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))
- **Aurora PostgreSQL Database** — Main database provisioned by IaC and used by e2e tests for validation scenarios ([iac-cos-lending-selling](../repos/iac-cos-lending-selling.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md))

## Data Flows

### Account Resolution Flow

Process of mapping loans to appropriate accounts for financial operations

  1. data-utils calls COS Lending Accounting API to retrieve account configurations
  2. data-utils maps loan details to specific accounts
  3. account mappings are stored in SellingDB (provisioned by IaC)
  4. e2e-tests validate the account mappings through simulated transactions
### End-to-End Loan Processing

Complete loan lifecycle testing from origination through purchase

  1. e2e-tests initialize test environment using infrastructure provisioned by IaC
  2. test simulates loan origination and processing using cos-simulator
  3. account resolution occurs through data-utils integration
  4. financial transactions execute against provisioned infrastructure
  5. results are validated against expected outcomes

## Integration Points

- **[cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)** → **[iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)** via infrastructure-usage: E2E tests execute against AWS resources (Aurora DB, S3, SQS) provisioned by the IaC repository
- **[cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)** → **[iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)** via database: Data utils service reads/writes to Aurora PostgreSQL database provisioned by IaC repository
- **[cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)** → **[cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)** via HTTP: E2E tests validate account resolution logic provided by data-utils through account-resolver API integration

## Patterns

- **Infrastructure as Code** — AWS resources defined and provisioned using Terragrunt for consistent environments ([iac-cos-lending-selling](../repos/iac-cos-lending-selling.md))
- **End-to-End Test Simulation** — Complete simulation of loan processing to validate business outcomes ([cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md))
- **Account Resolution** — Service pattern to map loans to their appropriate financial accounts ([cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))
- **Outbox Pattern** — Used for reliable transfer processing ensuring data consistency ([cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md))

## Open Questions

- How SellingDB in cos-lending-selling-data-utils maps to specific Aurora database instances defined in iac-cos-lending-selling
- Which specific S3 buckets from iac-cos-lending-selling are used by the e2e tests for test data storage
- How the cos-simulator referenced in e2e-tests is deployed - whether it's part of the IaC definition
- Whether the LoanActionsAccounts API in data-utils and e2e-tests are the same implementation or separate implementations

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-12T14:23:22.320Z*