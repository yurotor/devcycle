# Loan Inventory Management

## Overview

The Loan Inventory Management feature provides a comprehensive user interface for tracking, managing, and analyzing the bank's loan portfolio. It serves as the primary dashboard for financial officers and loan administrators to monitor loan statuses, particularly those marked as Held For Sale (HFS), and process pending approvals.

This feature exists to:
- Provide visibility into the current loan portfolio
- Track loans throughout their lifecycle
- Facilitate efficient decision-making through data filtering and sorting
- Streamline the approval process for loan-related actions

## How It Works

The Loan Inventory Management system primarily operates as a read-focused UI layer that:

1. **Retrieves loan data**: Fetches loan inventory information from the backend APIs
2. **Presents filterable views**: Allows users to narrow down the loan inventory by various criteria including:
   - Loan status
   - Origination date
   - Loan amount
   - Borrower information
   - Current stage in the selling process

3. **Status tracking**: Visually represents the current status of each loan (e.g., New, In Review, HFS, Sold)

4. **Approval queue**: Displays loans awaiting approval actions with relevant metadata and decision options

5. **History tracking**: Maintains and displays an audit trail of all actions taken on each loan

The UI communicates with the backend APIs to retrieve this data in real-time, with most operations being read-only. Write operations typically occur through separate transaction-specific workflows.

## Repos Involved

- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) - React frontend providing the user interface for loan inventory management
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Backend service providing data access and business logic

## Key APIs

### Loan Data Retrieval
- `GET /selling/api/loans/HFS/*` - Retrieves loans marked as Held For Sale with various filter options
- `GET /selling/api/loans/{id}` - Gets detailed information about a specific loan

### Session Management
- `POST /selling/api/sessions` - Creates a new session for tracking user interactions
- `GET /selling/api/sessions/{sessionId}/history` - Retrieves the history of actions for a given session

## Data Entities

- [Loan](../data-model/entities.md#loan) - Core entity representing a loan in the system
- [LoanDetails](../data-model/entities.md#loandetails) - Extended information about a loan
- [PendingApproval](../data-model/entities.md#pendingapproval) - Represents a loan awaiting approval action
- [ChatSession](../data-model/entities.md#chatsession) - Tracks communication sessions related to loans

The feature primarily interacts with these entities in read-only mode, with updates occurring through separate transaction workflows.

---

> **Repos:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:18:34.285Z*