# Multi-Fee Type Processing

## 1. Overview

The Multi-Fee Type Processing feature enables the platform to collect, track, and process various fee types within the loan management ecosystem. This capability is essential for handling the financial complexity of the loan marketplace, where different stakeholders (MPLs, investors, banks) incur different types of fees throughout the loan lifecycle.

The feature supports multiple fee categories including:
- DMV fees
- Florida stamp tax
- Loan payoff shortfall fees
- Merchant fees

By centralizing fee management, the system ensures accurate fee collection, automated transfer creation, and comprehensive tracking for financial reconciliation and reporting purposes.

## 2. How It Works

The Multi-Fee Type Processing feature follows a standardized workflow:

1. **Fee Detection & Calculation**:
   - The system identifies fee triggers based on loan events (origination, payoff, etc.)
   - Fee amounts are calculated based on predefined rules for each fee type
   - Contextual data is attached to fees (loan ID, contract ID, fee type, etc.)

2. **Fee Collection & Transfer Flow**:
   - When a fee is triggered, it's recorded in the [Fee](../data-model/entities.md) entity
   - The system automatically generates corresponding transfer records
   - Transfers are grouped into batches for processing

3. **True-Up Processing**:
   - Monthly true-up processes reconcile collected fees against expected amounts
   - Adjustments are automatically created for any discrepancies
   - True-up transfers are generated to balance accounts

4. **Fee Tracking & Reporting**:
   - All fee transactions are tracked with their full history
   - Fee statuses (pending, collected, adjusted) are maintained
   - Reporting capabilities provide visibility into fee activities across the platform

## 3. Repos Involved

The Multi-Fee Type Processing feature is implemented across two primary repositories:

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Contains the business logic, controllers, and service layers that handle fee processing workflows.

- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the database schema, entity models, and configurations that support fee storage and relationships.

## 4. Key APIs

The Multi-Fee Type Processing feature utilizes several internal APIs to enable its functionality:

- **Fee Management APIs**: Handle CRUD operations for fee records
- **Transfer Creation APIs**: Generate transfer records based on fee events
- **True-Up Processing APIs**: Execute monthly reconciliation of collected fees
- **Fee Reporting APIs**: Provide data access for fee-related reporting

## 5. Data Entities

The feature leverages multiple entities to manage the complete fee lifecycle:

- [Fee](../data-model/entities.md): Stores fee records with type, amount, status, and associated metadata
- [Transfer](../data-model/entities.md): Represents financial transfers related to fee collection
- [Batch](../data-model/entities.md): Groups related transfers for processing
- [Account](../data-model/entities.md): Tracks financial accounts involved in fee transactions
- [Loan](../data-model/entities.md): Associates fees with specific loans
- [Contract](../data-model/entities.md): Links fees to governing contracts
- [Investor](../data-model/entities.md): Connects fees to relevant investors
- [Bank](../data-model/entities.md): Relates fees to banking institutions
- [Mpl](../data-model/entities.md): Associates fees with marketplace lenders
- [LoanEvent](../data-model/entities.md): Triggers fee calculations based on loan lifecycle events

These entities work together to create a comprehensive system for tracking, processing, and reconciling various fee types throughout the loan marketplace.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:56:51.431Z*