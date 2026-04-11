# CLN-2216: Moment/LTHFS process.  Difference in money and loans — Analysis

*Completed: 2026-04-11T19:12:30.944Z*

## Summary

## Analysis Summary

Based on our discussion, I understand the following about ticket CLN-2216:

1. **Issue**: There's a discrepancy in calculations for Moment/LTHFS partners because the system is currently using the adjusted loan amount for draws instead of the base loan amount.

2. **Solution**: We need to modify the `CalculatePurchaseAmount` method in the `PurchaseService` class within the `COS.Lending.Selling.WebApi` repository.

3. **Specific Change**: Add conditional logic to check if the partner is Moment/LTHFS, and if so, use the `LoanAmount` property instead of `AdjustedLoanAmount` for calculating the draw amount.

4. **Scope**: This change applies only to Moment/LTHFS partners and should not affect calculations for other partners.

5. **Testing**: Unit tests for the PurchaseService will need to be updated to reflect this partner-specific behavior change.

This change should help the system's calculations more closely match the numbers expected by Moment/LTHFS, as mentioned in the ticket.

## Key Decisions

**Q:** I'll help you analyze this ticket which appears to be about using loan amount instead of adjusted loan amount for draws in the Moment/LTHFS process.
**A:** COS.Lending.Selling.WebApi PurchaseService

**Q:** Thank you for confirming it's in the PurchaseService within COS.Lending.Selling.WebApi. Now I need to understand the specific calculation that needs to be changed.
**A:** CalculatePurchaseAmount

**Q:** Thank you. Now I understand we need to modify the CalculatePurchaseAmount method in the PurchaseService. 
**A:** Yes

**Q:** I need to be more specific about the code change. Since we confirmed it's the CalculatePurchaseAmount method in the PurchaseService that needs updating, let me clarify the exact change needed.
**A:** Only for Moment/LTHFS partners

**Q:** Thank you for confirming this change is specific to Moment/LTHFS partners only. This helps clarify the scope of the change.
**A:** Yes, unit tests for PurchaseService

---

> Raw transcript: [analyze.md](../../raw/transcripts/cln-2216/analyze.md)

*Generated: 2026-04-11T19:12:30.944Z*