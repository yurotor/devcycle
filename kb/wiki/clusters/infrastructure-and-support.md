# Infrastructure and Support

## Shared Entities

- **Loan** — Core loan entity that flows from infrastructure provisioning to testing and account resolution ([iac-cos-lending-selling](../repos/iac-cos-lending-selling.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))
- **LoanAccount** — Account mappings for loans that are created by data-utils and validated in e2e tests ([cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))
- **AccountConfig** — Configuration for accounts used for various financial operations ([cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md), [cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))

## Data Flows

### Infrastructure Provisioning to Testing

AWS resources provisioned by IaC are used by E2E tests to verify functionality

  1. Provision Aurora DB
  2. Configure S3 buckets
  3. Setup ECS services
  4. Run E2E tests against provisioned infrastructure
### Account Resolution Flow

Account mapping data flows from data-utils to databases provisioned in IaC

  1. Fetch account data via accounting API
  2. Resolve correct accounts based on loan attributes
  3. Update account mappings in Selling DB

## Integration Points

- **[iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)** → **[cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)** via shared-db: E2E tests utilize the Aurora PostgreSQL databases provisioned by IaC
- **[iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)** → **[cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)** via shared-db: Data-utils service reads from and writes to the databases provisioned by IaC
- **[cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md)** → **[cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)** via shared-db: E2E tests validate the account mappings created by the data-utils service

## Patterns

- **Infrastructure as Code** — Declarative provisioning of AWS resources using Terragrunt for multiple environments ([iac-cos-lending-selling](../repos/iac-cos-lending-selling.md))
- **Simulator Pattern** — Simulates real-world scenarios and external dependencies for comprehensive testing ([cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md))
- **Data Mapper** — Maps and resolves account information from different data sources ([cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md))

## Open Questions

- In iac-cos-lending-selling, the relationship between AI-API service and its DynamoDB tables isn't clearly defined
- In cos-lending-selling-e2e-tests, the exact relationship between the SQS Payment Queue and the web-api service needs clarification
- In cos-lending-selling-data-utils, the specific rules for CustomPurchaseAccountMapping aren't defined

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-13T06:16:29.481Z*