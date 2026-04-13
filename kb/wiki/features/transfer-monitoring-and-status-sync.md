# Transfer Monitoring and Status Sync

## 1. Overview

The Transfer Monitoring and Status Sync feature provides real-time visibility and state management for financial transfers within the COS Lending platform. It tracks transfers sent to the Core Operating System (COS) and ensures bidirectional synchronization of status updates between COS and the Selling database.

This feature is essential because:
- It maintains data integrity between distributed systems
- It enables accurate reporting on transfer statuses
- It facilitates automated workflows triggered by transfer state changes
- It provides audit capabilities for financial transactions

The feature serves multiple critical flows including Loan Purchase and Funding, Daily Interest Accrual, and Fee Collection, ensuring that money movements are properly tracked and reconciled.

## 2. How It Works

The Transfer Monitoring and Status Sync operates through a multi-step process:

1. **Transfer Initiation**:
   - When a transfer is created in the Selling system, it's stored in the Selling DB with an initial status (typically "Pending").
   - A transfer request is sent to the COS core banking system.

2. **Status Polling**:
   - A scheduled background job polls COS for status updates on pending transfers.
   - The job uses a configurable frequency (typically every 15 minutes).
   - It queries only transfers that haven't reached terminal states (like "Completed" or "Failed").

3. **Status Synchronization**:
   - When a status change is detected in COS, the corresponding record in the Selling DB is updated.
   - The sync process captures additional metadata such as settlement timestamps, confirmation numbers, and failure reasons.
   - An event is published to notify dependent systems of the status change.

4. **Retry Mechanism**:
   - Failed transfers are automatically retried based on configurable rules (e.g., retry count, error type).
   - Permanent failures are flagged for manual review.

5. **Reporting and Alerts**:
   - The system generates alerts for transfers that remain in non-terminal states beyond expected timeframes.
   - Reconciliation reports identify discrepancies between COS and Selling DB transfer states.

## 3. Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Implements the core transfer monitoring logic, including the background job for status polling, retry mechanisms, and API endpoints for manual status checks.
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Defines the data schema for transfers and their statuses, including state transition rules and validation constraints.

## 4. Key APIs

The following endpoints are involved in the Transfer Monitoring and Status Sync feature:

- `GET /api/transfers/{id}/status`: Retrieves the current status of a specific transfer
- `POST /api/transfers/{id}/sync`: Manually triggers a status sync from COS for a specific transfer
- `GET /api/transfers/pending`: Retrieves all transfers in non-terminal states
- `PUT /api/transfers/{id}/retry`: Manually initiates a retry for a failed transfer
- `GET /api/transfers/reconciliation-report`: Generates a report of transfers with status discrepancies

## 5. Data Entities

The primary entities involved in this feature include:

- [Transfer](../data-model/entities.md): Represents a financial transfer with attributes like amount, currency, source, destination, and status
- [Account](../data-model/entities.md): Represents the source or destination accounts for transfers
- [Bank](../data-model/entities.md): Contains information about financial institutions involved in transfers
- [Batch](../data-model/entities.md): Represents a group of related transfers processed together
- [LoanAccount](../data-model/entities.md): Links transfers to specific loan accounts when applicable
- [LoanEvent](../data-model/entities.md): Records events triggered by transfer status changes (e.g., loan funding complete)
- [Fee](../data-model/entities.md): Associates fee collection transfers with the corresponding fee records

The [Transfer](../data-model/entities.md) entity maintains a comprehensive status history, enabling full auditability of the transfer lifecycle from creation through completion or failure.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:19:47.117Z*