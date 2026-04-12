# Batch Loan Processing

## Overview

Batch Loan Processing is a core feature that enables the grouping of multiple loans into batches for atomic bulk purchase operations. This functionality is essential for efficient loan management when dealing with large volumes of loans, allowing Marketplace Lenders (MPLs) to acquire multiple loans simultaneously as a single transaction.

Key capabilities include:
- Grouping loans into logical batches for bulk operations
- Atomic transactions that either succeed or fail as a whole
- Real-time progress tracking during batch processing
- Automatic rollback mechanisms when errors occur
- Consolidated financial reporting for batch transactions

This feature significantly improves operational efficiency for MPLs dealing with high-volume loan purchases and provides a more reliable transaction model than processing individual loans.

## How It Works

The Batch Loan Processing feature operates through a multi-step workflow:

1. **Batch Creation**:
   - An MPL selects multiple loans for purchase
   - System creates a `Batch` entity with a unique identifier
   - Selected loans are associated with the batch

2. **Validation Phase**:
   - All loans undergo pre-purchase validation checks
   - System verifies eligibility, contract terms, and account statuses
   - Any validation failures are flagged but don't terminate the process yet

3. **Atomic Transaction Processing**:
   - The system begins the purchase transaction in a transactional context
   - For each loan in the batch:
     - Ownership transfer is recorded
     - Financial entries are created
     - Servicing rights are updated if applicable

4. **Rollback Mechanism**:
   - If any loan in the batch fails processing, the entire batch is rolled back
   - The system uses database transactions to ensure atomicity
   - All temporary changes are reverted to maintain data integrity

5. **Progress Tracking**:
   - Real-time status updates are provided via the API
   - Detailed logs track each step of the batch processing
   - Status information includes completion percentage and any errors

6. **Reporting**:
   - Upon successful completion, consolidated financial reports are generated
   - Reports include aggregate purchase amounts, fees, and accounting entries
   - Historical batch data is maintained for audit and reconciliation purposes

## Repos Involved

The Batch Loan Processing feature is implemented across three main repositories:

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Handles the backend logic for batch creation, processing, validation, and rollback mechanisms. Implements the core business logic for atomic transactions.

- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): Provides the user interface for batch creation, monitoring progress, and reviewing batch reports. Includes visualizations for batch status and error handling.

- [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md): Contains end-to-end tests that validate the entire batch processing flow, including success scenarios, failure cases, and rollback functionality.

## Key APIs

### Batch Management
- `GET /api/batches` - Retrieves a list of batches with filtering options
- `GET /api/batches/{id}` - Gets detailed information about a specific batch
- `POST /api/batches` - Creates a new batch with selected loans
- `PUT /api/batches/{id}/process` - Initiates processing of a batch
- `GET /api/batches/{id}/status` - Retrieves real-time processing status

### Reporting
- `POST /api/reports/batch/{id}` - Generates consolidated financial reports for a batch
- `GET /api/batches/{id}/summary` - Retrieves summary statistics for a completed batch

### Related Loan APIs
- `GET /api/loans` - Used for selecting loans to include in batches
- `GET /api/loans/{id}` - Retrieves detailed information about individual loans in a batch

## Data Entities

The following entities are integral to the Batch Loan Processing feature:

- [Batch](../data-model/entities.md#batch) - The primary entity representing a collection of loans for bulk processing. Contains batch metadata, status information, and processing history.

- [Loan](../data-model/entities.md#loan) - Individual loans that can be added to batches. Each loan maintains a reference to its current batch (if any).

- [LoanAction](../data-model/entities.md#loanaction) - Records actions performed on loans during batch processing, including validation, purchase, and rollback events.

- [Transfer](../data-model/entities.md#transfer) - Represents the ownership transfer that occurs when loans are purchased in a batch.

- [Contract](../data-model/entities.md#contract) - Defines the terms under which loans in a batch are purchased.

- [Account](../data-model/entities.md#account) - Financial accounts affected by the batch transaction, including source and destination accounts.

Together, these entities provide a comprehensive data model for tracking and managing the entire batch processing lifecycle from creation to completion.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:24:00.531Z*