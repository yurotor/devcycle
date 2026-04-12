# Loan Purchase and Selling Flow

The Loan Purchase and Selling Flow manages the complete lifecycle of loans as they are purchased from Marketplace Lenders (MPLs), processed, and potentially sold to investors. The flow begins with loan origination and contract establishment between banks and MPLs, followed by batch processing of loans for purchase. Once purchased, the system manages interest accruals, fees (including volume fees and true-ups), and maintains appropriate accounting records.

As loans progress through their lifecycle, they undergo various state transitions including type changes, investor assignments, and potentially transfers between entities. The system supports both manual and automated purchase processes with configurable eligibility criteria. Throughout the flow, notifications are generated for relevant stakeholders about loan status changes, batch completions, and financial activities. The process includes reconciliation checkpoints to ensure data accuracy across systems.

## Steps

1. 1: Contract Establishment - MPL and bank establish loan purchasing terms and contracts that define interest rates, fees, and purchase criteria
2. 2: Loan Origination - MPL originates loans which become available for purchase by the bank
3. 3: Batch Creation - Loans are grouped into batches for efficient processing
4. 4: Eligibility Verification - System verifies loans meet purchase criteria based on contract terms
5. 5: Purchase Processing - Eligible loans are purchased and funds transferred to the MPL
6. 6: Interest Accrual - Daily interest calculations based on SOFR rates and contract terms
7. 7: Fee Processing - Collection of various fees including volume fees and true-ups based on contract terms
8. 8: Loan Grooming - Loans undergo type changes and investor assignments as needed
9. 9: Reconciliation - Loan data is reconciled with external systems to ensure accuracy
10. 10: Reporting - Reports are generated for accounting, compliance, and business purposes
11. 11: Potential Transfer/Sale - Loans may be transferred to other entities or sold to investors

## Repos Involved

[Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)

## Data Entities

[Loan](../data-model/entities.md), [PurchaseAccount](../data-model/entities.md), [BatchInfo](../data-model/entities.md), [Invoice](../data-model/entities.md), [Receipt](../data-model/entities.md), [Discrepancy](../data-model/entities.md), [SofrRate](../data-model/entities.md), [Investor](../data-model/entities.md), [Mpl](../data-model/entities.md), [Bank](../data-model/entities.md), [Transfer](../data-model/entities.md), [Contract](../data-model/entities.md), [LoanAction](../data-model/entities.md), [Account](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [VolumeFeeMonthlyMinimum](../data-model/entities.md), [LoanSaleStatusChanged](../data-model/entities.md)

## External Systems

- Cross River Bank COS
- AWS S3
- Lending Contracts Service
- Lending Accounting Service
- loan-origination-service
- investor-management-system

## Open Questions

- COS.Lending.Selling.WebApi: Exact auto-purchase configuration and eligibility criteria are not clearly defined
- Cos.Lending.Selling.Contracts: Relationship between issuingBankId and servicingBankId is unclear
- Cos.Lending.Selling.Contracts: The exact nature of the COS transfer system referenced in AddTransferRequest
- COS.Lending.Selling.WebApi: Exact contract model with MPLs and how terms are enforced
- cos-lending-selling-e2e-tests: The criteria for determining when a loan is ready for purchase are not fully documented

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T14:23:22.318Z*