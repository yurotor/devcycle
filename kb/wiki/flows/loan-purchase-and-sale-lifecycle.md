# Loan Purchase and Sale Lifecycle

The Loan Purchase and Sale Lifecycle manages the entire journey of loans from origination through purchase, servicing, and potential sale to investors. This process begins when loans are originated and designated for purchase, then validated for eligibility against business rules. The system processes loan purchases individually or in batches, calculating interest, fees, and managing transfers between accounts.

Once purchased, loans undergo ongoing servicing including interest accrual, fee calculation, and investor allocation. The lifecycle continues with potential loan grooming (changing loan types), investor reassignment, and eventual sale or maturity. Throughout this process, notifications are generated to keep stakeholders informed of status changes, batch completions, and fee charges.

## Steps

1. Loan Origination: Loans are created in the system and marked as available for purchase
2. Eligibility Verification: System validates loans against purchase criteria and business rules
3. Purchase Processing: Loans are purchased individually or in batches with transfers between accounts
4. Interest and Fee Calculation: System calculates interest accruals and applicable fees
5. Loan Servicing: Ongoing management including interest updates and fee processing
6. Loan Type Changes: Grooming processes may change loan types based on business rules
7. Investor Assignment: Loans may be assigned or reassigned to investors
8. Status Updates: Notifications are published about loan status changes
9. True-up Processing: Volume fees are calculated and charged based on agreements
10. Sale or Maturity: Loans are either sold to secondary investors or reach maturity

## Repos Involved

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)

## Data Entities

[Loan](../data-model/entities.md), [LoanAccount](../data-model/entities.md), [Account](../data-model/entities.md), [Transfer](../data-model/entities.md), [Batch](../data-model/entities.md), [Contract](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Fee](../data-model/entities.md), [Investor](../data-model/entities.md), [Mpl](../data-model/entities.md), [Bank](../data-model/entities.md)

## External Systems

- Cross River Bank COS
- AWS S3
- Lending Contracts Service
- Hooks Notification Service
- Lending Accounting Service
- CRB Identity Provider

## Open Questions

- The exact criteria that determines when a loan is ready for purchase in Cos.Lending.Selling.Contracts
- Specific reconciliation processes when discrepancies are found in COS.Lending.Selling.WebApi
- How servicing data updates from external systems affect loan status in Cos.Lending.Selling.DbModel

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-13T06:16:29.479Z*