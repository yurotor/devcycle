# Analysis Transcript — CLN-2893: Fees netting - tech design

*Generated: 2026-04-11T19:00:50.596Z*

---

**User**:

Here's the ticket: "Fees netting - tech design". We need to come up with a plan of “how” and make sure that the ETAs I provided are still aligned (or provide and updated ETA)notes:post purchase report - maybe should be postpone until post-purchase completedadd table matrix - netting enabled and fees charge timing - which one is the actual - need to be verified by product

---

**AI Analyst**:

I'll help you analyze the requirements for the "Fees netting - tech design" ticket. Let's start by understanding the scope of this feature.

Based on the ticket, it appears we need to design a technical solution for netting fees in the lending-selling system. Before diving deeper, I need to understand what exactly "fees netting" means in your context.

My recommendation: Fees netting likely refers to the process of offsetting various fees against each other before charging or disbursing them, possibly between marketplace lenders and investors.

What is your definition of "fees netting" in the context of this ticket?

---

**User**:

ok

---

**AI Analyst**:

I need to be more specific about what "fees netting" means for your implementation. Let me ask about which system components will be involved.

Based on the repositories available, this likely affects the fee collection and transaction processing parts of the system, potentially in COS.Lending.Selling.WebApi and Cos.Lending.Selling.DbModel.

My recommendation: This would primarily involve changes to the WebApi repository for business logic and the DbModel repository for data structure changes.

Which repositories or services will need to be modified for the fees netting implementation?

---

**User**:

COS.Lending.Selling.WebApi and Cos.Lending.Selling.DbModel

---

**AI Analyst**:

Thank you for confirming the repositories. Now I need to understand what data model changes might be required to support fees netting.

Since we're working with COS.Lending.Selling.WebApi and Cos.Lending.Selling.DbModel, we'll need to consider how the existing fee structures will need to be modified.

My recommendation: We'll likely need to add a "netting enabled" flag to fee configurations and potentially create new tables or fields to track netted fee calculations.

What specific data model changes will be required for fees netting?

---

**User**:

Add IsNettingEnabled flag to existing Fee tables

---

**AI Analyst**:

Thank you for confirming we need an IsNettingEnabled flag on existing Fee tables. Now let's understand the business logic changes needed for the netting process.

This will affect fee calculation and collection workflows in the COS.Lending.Selling.WebApi. We need to understand how fees should be netted when the flag is enabled.

My recommendation: The system will need new logic to aggregate fees by type, calculate net amounts, and modify existing fee charge processes.

How should the system behave when netting is enabled? For example, should it aggregate all fees before charging, or net fees by category?

---

**User**:

Net all fees into a single transaction

---

**AI Analyst**:

Thank you for clarifying. Now I understand that when netting is enabled, all fees should be consolidated into a single transaction instead of multiple separate fee charges.

Let's discuss the timing component mentioned in your ticket about "fees charge timing." This seems important for the implementation.

My recommendation: We should implement a configuration that controls when netted fees are charged (e.g., at loan purchase, monthly, or on a custom schedule).

When should the netted fees be charged? Is this dependent on existing fee schedules or is there a new timing mechanism needed?

---

**User**:

Yes

---

**AI Analyst**:

Based on our discussion, I can now summarize the technical design requirements for the fees netting feature:

1. **Scope:** Implement fees netting functionality that consolidates multiple fees into a single transaction when enabled.

2. **Repositories affected:**
   - COS.Lending.Selling.WebApi - For implementing the business logic
   - Cos.Lending.Selling.DbModel - For data model changes

3. **Data model changes:**
   - Add an `IsNettingEnabled` flag to existing Fee tables

4. **Business logic:**
   - When netting is enabled, aggregate all applicable fees into a single transaction
   - Fee charging timing will follow existing fee schedules

5. **Open items to be verified with product:**
   - The exact matrix of netting enabled vs. fees charge timing scenarios
   - Whether post-purchase report should be postponed until after post-purchase is completed

The implementation appears to be primarily focused on database model changes and business logic updates in the WebApi layer. This seems to be a moderate complexity feature that builds upon existing fee management infrastructure.

ETA validation will depend on the complexity of the fee calculation logic and any reporting requirements, but the changes appear to be well-scoped based on our discussion.