# CLN-2893: Fees netting - tech design — Analysis

*Completed: 2026-04-11T19:00:50.598Z*

## Summary

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

## Key Decisions

**Q:** I'll help you analyze the requirements for the "Fees netting - tech design" ticket. Let's start by understanding the scope of this feature.
**A:** ok

**Q:** I need to be more specific about what "fees netting" means for your implementation. Let me ask about which system components will be involved.
**A:** COS.Lending.Selling.WebApi and Cos.Lending.Selling.DbModel

**Q:** Thank you for confirming the repositories. Now I need to understand what data model changes might be required to support fees netting.
**A:** Add IsNettingEnabled flag to existing Fee tables

**Q:** Thank you for confirming we need an IsNettingEnabled flag on existing Fee tables. Now let's understand the business logic changes needed for the netting process.
**A:** Net all fees into a single transaction

**Q:** Thank you for clarifying. Now I understand that when netting is enabled, all fees should be consolidated into a single transaction instead of multiple separate fee charges.
**A:** Yes

---

> Raw transcript: [analyze.md](../../raw/transcripts/cln-2893/analyze.md)

*Generated: 2026-04-11T19:00:50.598Z*