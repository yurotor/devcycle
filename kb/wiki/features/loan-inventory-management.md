# Loan Inventory Management

## Overview

The Loan Inventory Management feature provides a comprehensive system for tracking, categorizing, and managing loan portfolios throughout their lifecycle. It enables users to maintain visibility and control over loans in various states, including Held For Sale (HFS), Loans To Be Held For Sale (LTHF), and those with pending approvals.

This feature exists to give Cross River Bank and its Marketplace Lender (MPL) partners a unified view of loan inventory, facilitating efficient secondary market operations and ensuring proper loan lifecycle management from origination through sale and servicing.

## How It Works

The feature operates on a client-server architecture where:

1. **Data Sourcing**: The backend WebAPI retrieves loan data from the core banking system and various loan servicing platforms, normalizes it, and maintains state information.

2. **Classification Logic**: Loans are categorized into:
   - **HFS (Held For Sale)**: Loans ready for sale to MPL partners
   - **LTHF (Loans To Be Held For Sale)**: Loans designated for future sale but not yet ready
   - **Pending Approval**: Loans awaiting review/approval before changing status

3. **User Interface Flow**:
   - Users access loan inventories through the React frontend
   - They can apply filters, sorting, and search criteria to locate specific loans
   - Detailed loan information is available on demand
   - Loan status changes trigger appropriate workflows

4. **Loan Purchase Flow**: The system tracks loans as they move through the purchase pipeline, maintaining history of all actions and state transitions.

## Repos Involved

- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): React frontend providing the user interface for loan inventory display, filtering, and management
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Backend service that provides loan data, processes status changes, and maintains the inventory state machine

## Key APIs

### Frontend Consumption APIs
- `GET /selling/api/loans/HFS/*` - Retrieves loans in Held For Sale status with various filter options
- `POST /selling/api/sessions` - Creates a new session for loan interaction tracking
- `GET /selling/api/sessions/{sessionId}/history` - Retrieves history of actions for a specific session
- `GET /selling/api/loans/{id}` - Retrieves detailed information for a specific loan

### Backend Services
- `GET /api/loans` - Returns collection of loans based on query parameters
- `GET /api/loans/{id}` - Returns detailed information for a specific loan
- `GET /api/batches` - Retrieves loan batches for inventory management
- `POST /api/reports` - Generates inventory reports based on specified criteria
- `POST /api/transfers` - Initiates loan transfers between statuses or owners

## Data Entities

- [Loan](../data-model/entities.md#loan): Core loan data including status, amounts, and identifiers
- [LoanDetails](../data-model/entities.md#loandetails): Extended loan information including term, interest rate, and borrower attributes
- [PendingApproval](../data-model/entities.md#pendingapproval): Represents loans awaiting approval with associated metadata
- [ChatSession](../data-model/entities.md#chatsession): Tracks communication related to specific loans
- [LoanAction](../data-model/entities.md#loanaction): Records actions taken on loans
- [Transfer](../data-model/entities.md#transfer): Documents movement of loans between statuses or owners
- [Batch](../data-model/entities.md#batch): Represents grouped loans for processing
- [InterestHistory](../data-model/entities.md#interesthistory): Tracks interest accruals on loans

The Loan Inventory Management feature provides the foundation for all secondary market operations in the COS Lending platform, enabling efficient loan portfolio management and sales facilitation.

---

> **Repos:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:25:31.622Z*