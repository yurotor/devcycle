# Loan Purchase and Transfer

The Loan Purchase and Transfer process enables financial institutions to buy, sell, and transfer loans between parties. It begins when a Marketplace Lender (MPL) initiates a loan purchase request, which triggers eligibility verification, pricing calculations, and purchase approval workflows. Once approved, the system executes the transfer of loan ownership, updates account records, and processes associated financial transactions.

After purchase completion, the system handles the necessary accounting entries, fee calculations, and interest accruals. The process includes batch capabilities for handling multiple loans simultaneously. Throughout the flow, notifications are sent to relevant stakeholders about status changes, and the system maintains a complete audit trail of all transfer activities. The flow concludes with reconciliation steps to ensure data consistency across systems.

## Steps

1. 1: MPL/Investor initiates loan purchase request through UI or API
2. 2: System validates loan eligibility (loan type, status, seasoning requirements)
3. 3: Purchase approval workflow processes the request
4. 4: System calculates fees and interest based on contract terms
5. 5: Transfer execution updates loan ownership records in database
6. 6: Batch processing handles multiple loans if part of a batch purchase
7. 7: System generates and processes financial transactions for the purchase
8. 8: Notification hooks publish loan sale status changes to other systems
9. 9: System updates accounting records for all parties involved
10. 10: Reconciliation process verifies data consistency across systems

## Repos Involved

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)

## Data Entities

[Loan](../data-model/entities.md), [Transfer](../data-model/entities.md), [Account](../data-model/entities.md), [Batch](../data-model/entities.md), [Contract](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Fee](../data-model/entities.md), [Investor](../data-model/entities.md), [Mpl](../data-model/entities.md), [Bank](../data-model/entities.md), [BatchPurchaseCompleted](../data-model/entities.md), [LoanSaleStatusChanged](../data-model/entities.md)

## External Systems

- Cross River Bank COS
- CosLending Hooks Hub
- Lending Accounting Service
- Lending Contracts Service
- AWS S3

## Open Questions

- Exact contract model with MPLs and how terms are enforced
- Specific business rules for loan approvals and the complete approval workflow
- Auto-purchase configuration and eligibility criteria
- How reconciliation with external systems is managed when discrepancies are found
- Relationship between issuingBankId and servicingBankId in loan transfers

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-13T06:16:29.479Z*