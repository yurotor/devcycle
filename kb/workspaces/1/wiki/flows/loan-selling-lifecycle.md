# Loan Selling Lifecycle

The Loan Selling Lifecycle encompasses the end-to-end process of managing loans from origination through sales and transfers between financial institutions. It begins with loan creation or acquisition, followed by seasoning or grooming procedures where loans are prepared for sale according to investor requirements. The process continues through investor matching, loan transfers, interest calculations, and fee management.

Once loans are ready for sale, they undergo approval workflows, batch processing, and transfer to purchasing institutions. The lifecycle includes ongoing servicing activities such as interest accrual, volume fee calculations, true-up processes, and reconciliation. Throughout the process, notifications and hooks alert relevant stakeholders about status changes, batch completions, and investor changes. The system maintains a complete audit trail of loan events and facilitates reporting and analytics.

## Steps

1. 1: Loan Origination/Acquisition - Loans enter the system either through direct origination or acquisition from external systems
2. 2: Loan Seasoning/Grooming - Loans undergo preparation processes to meet investor requirements and become eligible for sale
3. 3: Investor Matching - Loans are matched with appropriate investors based on loan type, terms, and investor preferences
4. 4: Approval Workflow - Pending loan sales undergo approval processes before proceeding to transfer
5. 5: Batch Processing - Approved loans are grouped into batches for efficient processing
6. 6: Transfer Execution - Loan ownership is transferred from issuing bank to purchasing institution with relevant documentation
7. 7: Interest Accrual - Daily interest calculations are performed on loans based on current rates (e.g., SOFR)
8. 8: Fee Processing - Volume fees, true-up fees and other charges are calculated and processed
9. 9: Reconciliation - Loan data is reconciled with external systems to identify and resolve discrepancies
10. 10: Notifications - Hooks service publishes events about loan status changes, batch completions, and other significant events
11. 11: Reporting - Data is aggregated for financial reporting and compliance requirements

## Repos Involved

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)

## Data Entities

[Loan](../data-model/entities.md), [Account](../data-model/entities.md), [PurchaseAccount](../data-model/entities.md), [Transfer](../data-model/entities.md), [Contract](../data-model/entities.md), [Batch](../data-model/entities.md), [BatchInfo](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Fee](../data-model/entities.md), [Investor](../data-model/entities.md), [Mpl](../data-model/entities.md), [Bank](../data-model/entities.md), [LoanAccount](../data-model/entities.md), [LoanEvent](../data-model/entities.md), [VolumeFeeMonthlyMinimum](../data-model/entities.md), [SofrRate](../data-model/entities.md)

## External Systems

- CosLending Hooks Hub
- OAuth Identity Provider
- CRB Identity Provider
- CRB AI Service
- CRB Menu Service
- Cross River Bank COS
- AWS S3
- Lending Contracts Service
- Hooks Notification Service
- Lending Accounting Service

## Open Questions

- Cos.Lending.Selling.DbModel: The exact mechanism for how tenant filtering is applied to database queries is not clear from the model definitions
- COS.Lending.Selling.WebApi: How loan approval workflow is structured and what triggers state transitions
- COS.Lending.Selling.WebApi: Specifics around the auto-purchase configuration and eligibility criteria
- COS.Lending.Selling.Contracts: The exact nature of the COS transfer system referenced in AddTransferRequest
- COS.Lending.Selling.Contracts: Purpose of the 'field1' through 'field21' properties on LoanInfo
- COS.Lending.Selling.UI: The relationship between loans and LTHFs (Loans To Be Held For Sale) is not clearly defined

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-16T12:55:41.325Z*