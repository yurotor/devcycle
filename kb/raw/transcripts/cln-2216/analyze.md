# Analysis Transcript — CLN-2216: Moment/LTHFS process.  Difference in money and loans

*Generated: 2026-04-11T19:12:30.944Z*

---

**User**:

Here's the ticket: "Moment/LTHFS process.  Difference in money and loans". Hi.    See belowWe should be using the loan amount for the draw, not the adjusted loan amount, for the purchaseThis should get us closer to matching to their numbersCopy of 20250902 SG LS68.xlsxsublines_to_end_seasoning.csv

---

**AI Analyst**:

I'll help you analyze this ticket which appears to be about using loan amount instead of adjusted loan amount for draws in the Moment/LTHFS process.

First, I need to understand which specific part of the system this change affects. Looking at the ticket, it mentions "purchase" and draws, which suggests this is related to the loan selling process.

My recommendation: This likely affects the purchase process in the COS.Lending.Selling.WebApi repository, specifically where draw amounts are calculated.

Which specific system component handles the draw calculation for Moment/LTHFS purchases?

---

**User**:

COS.Lending.Selling.WebApi PurchaseService

---

**AI Analyst**:

Thank you for confirming it's in the PurchaseService within COS.Lending.Selling.WebApi. Now I need to understand the specific calculation that needs to be changed.

Based on the ticket, there's a distinction between "loan amount" and "adjusted loan amount" that's causing a discrepancy with Moment/LTHFS numbers. We need to use the former instead of the latter for draws.

My recommendation: We should modify the draw calculation logic in PurchaseService to use the base loan amount rather than any adjusted version.

Can you confirm what specific method or function in the PurchaseService is calculating the draw amount currently?

---

**User**:

CalculatePurchaseAmount

---

**AI Analyst**:

Thank you. Now I understand we need to modify the CalculatePurchaseAmount method in the PurchaseService. 

Let's clarify exactly what field needs to be used instead of the current one. The ticket mentions "loan amount" instead of "adjusted loan amount".

My recommendation: We should update the CalculatePurchaseAmount method to use the LoanAmount property instead of AdjustedLoanAmount (or similar field).

Which specific field or property should be used instead of the current one in the calculation?

---

**User**:

Yes

---

**AI Analyst**:

I need to be more specific about the code change. Since we confirmed it's the CalculatePurchaseAmount method in the PurchaseService that needs updating, let me clarify the exact change needed.

My recommendation: The method should use the base LoanAmount property instead of AdjustedLoanAmount for Moment/LTHFS purchases specifically.

Does this change need to apply only to Moment/LTHFS partners, or should it be applied to all partners in the system?

---

**User**:

Only for Moment/LTHFS partners

---

**AI Analyst**:

Thank you for confirming this change is specific to Moment/LTHFS partners only. This helps clarify the scope of the change.

Since we need to make a partner-specific modification, we'll need to add conditional logic in the CalculatePurchaseAmount method to use the loan amount instead of adjusted loan amount only for Moment/LTHFS.

My recommendation: Add a condition in CalculatePurchaseAmount that checks if the partner is Moment/LTHFS and uses LoanAmount instead of AdjustedLoanAmount only for those partners.

Are there any tests that will need to be updated to reflect this change in behavior?

---

**User**:

Yes, unit tests for PurchaseService

---

**AI Analyst**:

## Analysis Summary

Based on our discussion, I understand the following about ticket CLN-2216:

1. **Issue**: There's a discrepancy in calculations for Moment/LTHFS partners because the system is currently using the adjusted loan amount for draws instead of the base loan amount.

2. **Solution**: We need to modify the `CalculatePurchaseAmount` method in the `PurchaseService` class within the `COS.Lending.Selling.WebApi` repository.

3. **Specific Change**: Add conditional logic to check if the partner is Moment/LTHFS, and if so, use the `LoanAmount` property instead of `AdjustedLoanAmount` for calculating the draw amount.

4. **Scope**: This change applies only to Moment/LTHFS partners and should not affect calculations for other partners.

5. **Testing**: Unit tests for the PurchaseService will need to be updated to reflect this partner-specific behavior change.

This change should help the system's calculations more closely match the numbers expected by Moment/LTHFS, as mentioned in the ticket.