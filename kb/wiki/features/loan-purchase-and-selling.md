# Loan Purchase and Selling

## Overview

The Loan Purchase and Selling feature provides a comprehensive workflow for Marketplace Lenders (MPLs) to sell loans to investors through Cross River Bank's platform. This feature is a cornerstone of the bank's lending ecosystem, allowing efficient loan trading between financial partners.

This feature exists to:
- Enable MPLs to manage and sell their loan portfolios to investors
- Provide a systematic way to track and process loan transfers in batches
- Ensure proper accounting and transaction history for regulatory compliance
- Facilitate the loan secondary market through Cross River Bank's infrastructure

## How It Works

The Loan Purchase and Selling process follows a batch-based workflow:

1. **Loan Selection**: An MPL user selects eligible loans for sale through the web interface, grouping them into a batch transaction.

2. **Batch Creation**: The WebApi receives the selection and creates a batch record in the database, assigning a unique batch ID and capturing metadata about the selected loans.

3. **Transfer Initiation**: An Outbox processor picks up the new batch and initiates transfer requests for each loan in the batch, inserting records into the transfer queue.

4. **Transaction Processing**: The COS Transaction Service processes each transfer, handling the accounting entries, updating loan ownership records, and ensuring funds are properly distributed between accounts.

5. **Completion Notification**: When all loans in a batch have been processed, a completion event triggers a notification through the hooks system.

6. **Status Updates**: The batch status and individual loan statuses are updated in the database, making the changes visible in the UI.

The system employs asynchronous processing to handle large volumes of loans efficiently, with error handling and retry mechanisms for failed transfers.

## Repos Involved

- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): Provides the user interface for selecting loans, initiating sales, and monitoring batch progress
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Handles API requests, manages batch creation, and initiates the transfer process
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains Airflow DAGs that orchestrate the batch processing workflows
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Defines the database models used throughout the loan selling process

## Key APIs

### Loan Selection and Viewing
- `GET /selling/api/loans/HFS/*` - Retrieve loans available for sale (Held For Sale)
- `GET /selling/api/loans/{id}` - Get detailed information about a specific loan
- `GET /api/loans` - List loans with filtering options
- `GET /api/loans/{id}` - Retrieve detailed loan information

### Batch Management
- `POST /api/batches` - Create a new batch of loans for processing
- `GET /api/batches` - List existing batches with status information

### Transfer Processing
- `POST /api/transfers` - Initiate transfers for loans in a batch

### History and Tracking
- `GET /selling/api/sessions/{sessionId}/history` - View historical actions for a loan selling session
- `POST /selling/api/sessions` - Create a new loan selling session

## Data Entities

The feature uses these primary data entities:

- [Loan](../data-model/entities.md#loan) - Core entity representing a financial loan with its terms and conditions
- [Batch](../data-model/entities.md#batch) - Groups multiple loans for processing as a single transaction
- [Transfer](../data-model/entities.md#transfer) - Represents the movement of a loan between parties
- [Account](../data-model/entities.md#account) - Financial accounts involved in the loan transactions
- [LoanAction](../data-model/entities.md#loanaction) - Records actions performed on loans
- [LoanEvent](../data-model/entities.md#loanevent) - Tracks significant events in a loan's lifecycle
- [Contract](../data-model/entities.md#contract) - Defines the legal agreement between parties for loan sales
- [InterestHistory](../data-model/entities.md#interesthistory) - Records interest accruals on loans

The batch processing architecture ensures scalability and reliability when handling large volumes of loan sales, while maintaining comprehensive audit trails for compliance purposes.

---

> **Repos:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T12:36:03.788Z*