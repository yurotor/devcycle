# Loan Grooming and Type Changes

## 1. Overview

The Loan Grooming and Type Changes feature manages the transition of loans between different lifecycle states and characteristics within the COS Lending Selling platform. This functionality is essential for maintaining accurate loan portfolio management as loans move through various stages of their lifecycle.

Key capabilities include:
- Managing transitions between loan types (HFS → LTHFS → RET)
- Processing investor reassignments
- Handling loan seasoning adjustments
- Executing associated financial adjustments (reverse interest, principal reallocation)

This feature exists to support the dynamic nature of loan management, allowing Cross River Bank and its partners to adapt to changing market conditions, portfolio strategies, and regulatory requirements.

## 2. How It Works

The Loan Grooming and Type Changes process follows this general flow:

1. **Initiation**: Changes to loan characteristics are triggered either through scheduled processes or manual requests.

2. **Validation**: The system validates that the requested changes comply with business rules and that the loan is eligible for the requested transition.

3. **Financial Calculations**:
   - For loan type transitions, the system recalculates interest based on the new loan type's characteristics.
   - When reassigning investors, financial obligations are reallocated between parties.
   - For seasoning adjustments, the loan's age and associated metrics are updated.

4. **Reverse Interest Processing**: If required, previously accrued interest is reversed and recalculated based on new loan parameters.

5. **Principal Reallocation**: Loan principal may be reallocated between different accounts or investors based on the type change.

6. **Event Recording**: All changes are recorded as loan events to maintain a complete audit trail.

7. **Notification**: Relevant stakeholders are notified of the completed changes.

## 3. Repos Involved

The feature is implemented across several repositories:

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Provides API endpoints for triggering and managing loan type changes.

- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): Implements the user interface components for initiating and monitoring loan grooming operations.

- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Defines the database schema and relationships for loan type changes, handling the persistence of loan state transitions and their financial impacts.

- [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md): Contains the data contracts and DTOs used for loan grooming operations across the system.

## 4. Key APIs

The system exposes several API endpoints for managing loan grooming and type changes:

- `POST /api/loans/{loanId}/typechange`: Initiates a loan type change process
- `GET /api/loans/{loanId}/eligibility/typechange`: Checks if a loan is eligible for type change
- `POST /api/loans/{loanId}/investor/reassign`: Reassigns a loan to a different investor
- `POST /api/loans/batch/seasoning`: Updates seasoning information for a batch of loans
- `GET /api/loans/typechange/history`: Retrieves historical type changes for a loan

## 5. Data Entities

The following entities are central to the Loan Grooming and Type Changes feature:

- [Loan](../data-model/entities.md#loan): The core entity that undergoes type changes, storing current loan type and status.

- [LoanEvent](../data-model/entities.md#loanevent): Records all changes to loan characteristics, including type changes, providing an audit trail.

- [InterestHistory](../data-model/entities.md#interesthistory): Tracks interest calculations before and after loan type changes.

- [Investor](../data-model/entities.md#investor): Represents the parties to whom loans may be reassigned.

- [LoanAccount](../data-model/entities.md#loanaccount): Manages the financial accounting for loans as they change types.

- [Servicing](../data-model/entities.md#servicing): Contains servicing information that may change as loan types transition.

The system maintains referential integrity across these entities to ensure consistent state management throughout loan type transitions.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:58:10.510Z*