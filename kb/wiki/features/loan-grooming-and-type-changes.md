# Loan Grooming and Type Changes

## 1. Overview

The "Loan Grooming and Type Changes" feature automatically manages the evolution of loans as they pass through specific seasoning periods. It enables:

- Dynamic loan type changes based on predefined seasoning rules
- Automatic reassignment of investor relationships when loan types change
- Accurate account mapping updates to reflect the new loan characteristics
- Event notifications to dependent systems when changes occur

This feature exists to support the business requirements where loans need to transition between different classifications (types) after they've been in the system for specific periods, which affects how they're managed, reported on, and potentially who they're assigned to.

## 2. How It Works

The loan grooming process follows this technical workflow:

1. **Seasoning Detection**: A scheduled process in the WebApi identifies loans that have completed their defined seasoning period.

2. **Loan Type Change**: The WebApi grooming process evaluates eligible loans and changes their loan type based on business rules.

3. **Account Mapping Updates**: When a loan type changes, the data-utils component updates account mappings to ensure proper financial tracking in the new loan type.

4. **Event Publication**: The system generates and publishes a `LoanTypeChanged` event through the Hooks service.

5. **Investor Assignment Updates**: If the loan type change affects investor eligibility or assignment, the system automatically updates these relationships based on configured rules.

The process runs on a scheduled basis and maintains audit records of all changes for compliance and tracking purposes.

## 3. Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Contains the core grooming process logic that identifies and processes loans eligible for type changes
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) - Orchestrates scheduled runs of the grooming process
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Provides data models and persistence for loan types and account relationships
- [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) - Publishes the LoanTypeChanged events to notify other systems

## 4. Key APIs

- `GET /api/loans` - Retrieves loans with their current types and seasoning status
- `GET /api/loans/{id}` - Gets details for a specific loan, including its type history
- `POST /selling/hooks/api/sendNotification` - Used internally to publish the LoanTypeChanged event

## 5. Data Entities

- [Loan](../data-model/entities.md#loan) - The primary entity that undergoes type changes
- [LoanAccount](../data-model/entities.md#loanaccount) - Maps loans to their associated accounts, updated during grooming
- [Account](../data-model/entities.md#account) - Financial accounts affected by loan type changes
- [LoanEvent](../data-model/entities.md#loanevent) - Records type change events for audit purposes
- [Investor](../data-model/entities.md#investor) - May be updated when loan types change if investor assignments are affected
- [LoanAction](../data-model/entities.md#loanaction) - Records the type change action with timestamps and users

The `LoanTypeChanged` event contains information about the loan ID, old type, new type, timestamp, and reason for the change.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T12:37:25.470Z*