# Auto-Purchase Functionality

## Overview

The Auto-Purchase Functionality is a background service that automatically purchases eligible loans that meet predefined criteria without requiring manual intervention. This feature streamlines high-volume loan acquisitions, improving operational efficiency for marketplace lenders (MPLs), investors, and Cross River Bank within the COS Lending Selling platform. 

By automating the purchase decision process, the system can handle larger transaction volumes, reduce human error, and accelerate the loan acquisition timeline, allowing business stakeholders to focus on exception handling rather than routine purchases.

## How It Works

The Auto-Purchase service operates as a background process that:

1. **Criteria Evaluation**: Continuously monitors the loan inventory against configurable purchase criteria including:
   - Loan attributes (amount, term, interest rate)
   - Borrower characteristics (credit score range, DTI ratios)
   - Regulatory compliance requirements
   - Custom business rules defined by purchasers

2. **Purchase Decision**:
   - When a loan matches all criteria for a specific purchase program, it's flagged for auto-purchase
   - System validates available funding limits for the purchaser
   - Confirms no manual review flags are present

3. **Execution Process**:
   - Initiates the standard Loan Purchase End-to-End Flow
   - Creates purchase transactions in the system
   - Manages settlement accounting entries
   - Updates loan ownership status
   - Generates confirmation notifications to relevant parties

4. **Exception Handling**:
   - Logs failed purchase attempts
   - Routes edge cases to manual review queues
   - Provides detailed audit trails for all automation decisions

The service integrates with the platform's broader loan purchase workflow while bypassing manual approval steps for qualifying loans.

## Repos Involved

The primary repository involved in this functionality is:
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) - Contains the core implementation of the auto-purchase background service, criteria evaluation logic, and integration with the loan purchase flow

## Key APIs

While there are no direct API endpoints listed for this feature, the auto-purchase functionality likely utilizes internal service methods within the Lending Selling platform to execute purchases programmatically.

The feature operates as a background service rather than exposing external API endpoints for triggering purchases.

## Data Entities

The auto-purchase functionality interacts with various entities in the system, including:

- Loan entities (for eligibility assessment)
- Purchase criteria configuration entities
- Transaction records
- Funding source accounts
- Purchaser profiles

Note: Specific entity documentation was not provided in the feature description, but these entities would typically be involved in the auto-purchase workflow.

The complete Loan Purchase End-to-End Flow manages how data transitions through these entities during the automated purchase process.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:58:43.509Z*