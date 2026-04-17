# Transfer Status Synchronization

## Overview

The Transfer Status Synchronization feature provides a critical integration between the Selling system and the COS (Core Operations System) transfer system. It enables eventual consistency of transfer statuses by continuously polling the COS transfer system and updating the local transfer records accordingly.

This feature exists to ensure that the Selling system maintains an accurate view of transfer states even when the core banking operations process transfers asynchronously. This synchronization is essential for providing accurate status information to users, triggering downstream processes, and maintaining data integrity across systems.

## How It Works

The synchronization operates through a scheduled polling mechanism:

1. **Polling Process**: At regular intervals, the system identifies transfers in non-terminal states (such as "Pending", "Processing", or "In Progress") that need status updates.

2. **Status Retrieval**: For each identified transfer, the system queries the COS transfer system using transfer reference IDs to get the current status.

3. **Status Update**: When a status change is detected, the local transfer record in the Selling system is updated with:
   - The new status
   - Any additional metadata from the core system
   - Timestamp of the synchronization

4. **Event Emission**: Status changes may trigger events that notify other components of the system to take action based on the new status.

5. **Retry Logic**: The system includes intelligent retry mechanisms for transfers that consistently fail to sync, with progressive backoff to reduce system load.

The synchronization process is part of the Loan Purchase End-to-End Flow, ensuring that all transfer statuses are eventually consistent with the core banking system.

## Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Contains the synchronization service and scheduled job implementations
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the data models for storing and updating transfer records

## Key APIs

This feature primarily operates as an internal background process and does not expose dedicated external APIs. Instead, it consumes internal APIs from the COS transfer system to retrieve status updates.

## Data Entities

The feature primarily works with the following entities:

- [Transfer](../data-model/entities.md#transfer): Represents a financial transfer record with status information that needs to be synchronized
- [Batch](../data-model/entities.md#batch): Contains groups of transfers that may be synchronized together
- [Loan](../data-model/entities.md#loan): Transfers are often associated with loan operations
- [LoanEvent](../data-model/entities.md#loanevent): Transfer status changes may be recorded as loan events

The synchronization process ensures that these entities maintain accurate and up-to-date status information reflecting the actual state in the core banking system.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:59:17.611Z*