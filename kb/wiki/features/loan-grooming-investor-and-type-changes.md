# Loan Grooming (Investor and Type Changes)

## 1. Overview

Loan Grooming is a specialized workflow designed to handle modifications to a loan's investor or type after initial setup. This feature is critical in financial systems where loans may need to be reassigned between different investors or recategorized to different loan types based on business needs, regulatory changes, or correction of prior errors.

The primary business purpose of this feature is to:
- Enable orderly transition of loan ownership between investors
- Support loan type reclassification while preserving financial integrity
- Maintain accurate accounting records with proper approvals
- Ensure regulatory compliance through the change process

## 2. How It Works

The Loan Grooming workflow follows these technical steps:

1. **Initiation**:
   - A loan officer initiates a grooming request through the UI, specifying the target loan, new investor and/or loan type.
   - The system creates a pending approval record and initiates a chat session for documentation.

2. **Validation**:
   - The system validates that the loan is eligible for grooming based on its current status and characteristics.
   - Business rules are applied to ensure the requested changes are permissible.

3. **Approval Process**:
   - The request enters an approval queue visible to authorized approvers.
   - Approvers can review the loan details, requested changes, and rationale through the UI.
   - Approval or rejection is recorded with appropriate audit trail.

4. **Execution (upon approval)**:
   - **Account Remapping**: The system remaps the loan to different accounts based on the new investor/type.
   - **Interest Adjustments**: Retroactive interest calculations are performed if necessary.
   - **Transfer Processing**:
     - Existing incomplete transfers are reversed.
     - New transfers are created according to the new loan configuration.
     - Accounting entries are generated to reflect the changes.

5. **Completion**:
   - The loan record is updated with the new investor/type information.
   - A loan event is recorded documenting the change.
   - Notification is sent to relevant stakeholders.

## 3. Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Houses the backend logic for the grooming workflow, approval process, and financial calculations
- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) - Provides the user interface for initiating and approving loan grooming requests
- [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md) - Defines the data contracts used for the grooming API operations
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Contains the database models and context for persisting grooming-related data

## 4. Key APIs

- `POST /selling/api/loans/{loanId}/groom` - Initiates a loan grooming request
- `GET /selling/api/loans/{loanId}/groomingHistory` - Retrieves the history of grooming operations for a loan
- `POST /selling/api/approvals/grooming/{requestId}` - Endpoint for approving/rejecting a grooming request
- `GET /selling/api/sessions/{sessionId}/history` - Retrieves the chat history for a grooming request
- `POST /selling/api/sessions` - Creates a new chat session for documenting the grooming process

## 5. Data Entities

- [Loan](../data-model/entities.md#loan) - The core entity being modified by the grooming process
- [LoanAccount](../data-model/entities.md#loanaccount) - Maps loans to accounting structures, updated during grooming
- [Investor](../data-model/entities.md#investor) - Entity representing the loan owner that may be changed
- [Transfer](../data-model/entities.md#transfer) - Financial transfers that may need reversal and re-execution
- [LoanEvent](../data-model/entities.md#loanevent) - Audit records of changes to the loan
- [InterestHistory](../data-model/entities.md#interesthistory) - Records of interest calculations affected by grooming
- [PendingApproval](../data-model/entities.md#pendingapproval) - Tracks approval workflow status
- [ChatSession](../data-model/entities.md#chatsession) - Documents communication during the grooming process

The Loan Grooming feature represents a complex but necessary workflow in the loan management lifecycle, ensuring that loans can be properly reassigned while maintaining financial accuracy and regulatory compliance.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [Cos.Lending.Selling.Contracts](../repos/cos-lending-selling-contracts.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:18:18.444Z*