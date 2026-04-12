# Loan Grooming and Seasoning

## Overview

The Loan Grooming and Seasoning feature automatically reclassifies loans based on predefined aging rules and contract specifications. As loans mature and progress through their lifecycle, this system manages their transition between different statuses, types, or investor allocations based on time-based criteria and business rules.

This feature exists to:
- Enforce contract-based aging requirements for loans
- Automate the classification and reclassification process as loans mature
- Ensure loans are properly allocated to investors based on seasoning criteria
- Reduce manual intervention and potential errors in loan categorization

## How It Works

The Loan Grooming process operates through a scheduled workflow that:

1. **Loan Identification**: Identifies loans eligible for reclassification or status change based on their current age
2. **Rule Application**: Applies predefined business rules from contracts to determine appropriate classification changes
3. **Transition Management**: Executes the reclassification, updating loan types and investor allocations
4. **Audit Tracking**: Records all transitions in the loan history to maintain a comprehensive audit trail

The process follows this data flow:

1. Daily scheduled DAGs scan the loan portfolio for loans meeting seasoning criteria
2. Contract rules are retrieved and applied to eligible loans
3. Loan entities are updated with new classifications/allocations 
4. LoanAction records are created to document the transition
5. If required, transfers are generated when loans change investor allocations

Critical business rules include:
- Time-based transitions (e.g., 30/60/90 day aging periods)
- Performance-based criteria (payment history requirements)
- Contract-specific seasoning requirements by loan type
- Investor allocation rules based on loan maturity

## Repos Involved

The feature is implemented across two main repositories:

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Contains the core domain logic, entities, and APIs for loan management including the grooming rule definitions and execution logic
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md) - Handles the scheduled execution of grooming processes through Airflow DAGs that trigger the reclassification workflows

## Key APIs

The following endpoints are involved in the loan grooming process:

- `GET /api/loans` - Retrieves loans for evaluation with filtering options for grooming eligibility
- `GET /api/loans/{id}` - Gets specific loan details including current classification and aging data
- `POST /api/transfers` - Creates transfer records when loans change ownership or allocation due to seasoning

## Data Entities

The feature primarily works with these entities:

- [Loan](../data-model/entities.md) - Core entity that contains classification, aging data and references to contracts
- [LoanAction](../data-model/entities.md) - Records all grooming transitions and reclassification events
- [Transfer](../data-model/entities.md) - Generated when loans transition between investors due to seasoning rules
- [Contract](../data-model/entities.md) - Defines the grooming rules, seasoning periods, and investor allocation criteria
- [Batch](../data-model/entities.md) - Groups loans processed in the same grooming cycle for operational efficiency

The aging and seasoning rules are defined as part of the Contract entity, with specific periods, criteria and resulting classifications configured for different loan types and MPL relationships.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:24:44.692Z*