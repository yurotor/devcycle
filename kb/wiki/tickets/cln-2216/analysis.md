# CLN-2216: Moment/LTHFS process.  Difference in money and loans — Analysis

*Completed: 2026-04-11T15:15:47.592Z*

## Summary

## Analysis Summary

Based on our discussion, I understand the requirements for ticket CLN-2216 as follows:

1. **Issue**: There's a discrepancy between expected and actual financial calculations in the Moment/LTHFS loan purchase process.

2. **Root Cause**: The system is currently using the adjusted loan amount instead of the original loan amount for calculating draws during purchases.

3. **Required Change**: Modify the PurchaseService in COS.Lending.Selling.WebApi to use the LoanAmount field instead of AdjustedLoanAmount field specifically for Moment/LTHFS purchases.

4. **Scope**: This change applies only to Moment/LTHFS purchases and does not affect other loan purchase processes.

5. **Expected Outcome**: Using the loan amount for the draw calculation should bring the numbers closer to Moment/LTHFS's expected values, resolving the discrepancy noted in the ticket.

The implementation will require targeted changes to the draw calculation logic in PurchaseService with conditional handling to ensure this modification only affects Moment/LTHFS purchases.

## Key Decisions

**Q:** I'll help analyze this requirement. It appears to relate to how loan amounts are calculated for purchases, specifically changing from using adjusted loan amounts to the original loan amount for draws in the Moment/LTHFS process.
**A:** COS.Lending.Selling.WebApi

**Q:** Thank you for confirming. Now I need to understand the specific components within COS.Lending.Selling.WebApi that handle the draw amount calculations for Moment/LTHFS purchases.
**A:** PurchaseService

**Q:** Thank you for confirming that PurchaseService is involved. Now I need to understand the specific fields or properties that need to be modified to use the loan amount instead of adjusted loan amount.
**A:** Currently uses AdjustedLoanAmount, should use LoanAmount

**Q:** Thank you for confirming. Now I need to understand the scope of this change and any dependencies it might affect.
**A:** Yes

**Q:** I need to clarify your response. When you say "Yes", does that mean this change should apply specifically to only Moment/LTHFS purchases, or should it apply to all loan purchases in the system?
**A:** Only Moment/LTHFS purchases

---

> Raw transcript: [analyze.md](../../raw/transcripts/cln-2216/analyze.md)

*Generated: 2026-04-11T15:15:47.592Z*