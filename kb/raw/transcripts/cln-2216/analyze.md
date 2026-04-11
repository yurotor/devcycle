# Analysis Transcript — CLN-2216: Moment/LTHFS process.  Difference in money and loans

*Generated: 2026-04-11T18:56:49.197Z*

---

**User**:

Here's the ticket: "Moment/LTHFS process.  Difference in money and loans". Hi.    See belowWe should be using the loan amount for the draw, not the adjusted loan amount, for the purchaseThis should get us closer to matching to their numbersCopy of 20250902 SG LS68.xlsxsublines_to_end_seasoning.csv

---

**AI Analyst**:

I need to understand more about this ticket regarding using loan amount instead of adjusted loan amount for draws in the Moment/LTHFS process.

First, I'd like to clarify which specific system or repository is affected by this change.

My recommendation: This likely involves the COS.Lending.Selling.WebApi repository since it handles loan acquisition workflows and funding transfers.

---

**User**:

COS.Lending.Selling.WebApi

---

**AI Analyst**:

Thank you for confirming it's in COS.Lending.Selling.WebApi. Now I need to understand the specific part of the loan purchase process that needs modification.

Based on the ticket, this appears to be related to the Moment/LTHFS process where we're currently using adjusted loan amount for draws instead of the raw loan amount.

My recommendation: This likely involves changing the purchase calculation logic in a service or handler related to loan draws.

---

**User**:

PurchaseService.cs

---

**AI Analyst**:

Thank you for identifying PurchaseService.cs. Now I need to understand what specific calculation or method needs to be modified to use loan amount instead of adjusted loan amount.

My recommendation: We likely need to modify a method that calculates the draw amount during the purchase process.

---

**User**:

CalculatePurchaseAmount

---

**AI Analyst**:

Thank you for confirming it's the CalculatePurchaseAmount method. I need to understand the current implementation and what exactly needs to be changed.

The ticket mentions we should use the loan amount instead of the adjusted loan amount for the draw. This would affect how we calculate the purchase amount for Moment/LTHFS loans.

My recommendation: We need to modify CalculatePurchaseAmount to use Loan.LoanAmount instead of Loan.AdjustedLoanAmount when calculating for Moment/LTHFS partners.

Would this change need to be conditional based on the partner type?

---

**User**:

Yes, only change calculation for Moment/LTHFS partners

---

**AI Analyst**:

Thank you for the clarification. To ensure we implement this correctly, I need to confirm the appropriate way to identify Moment/LTHFS partners in the code.

My recommendation: Add a conditional check for Moment/LTHFS partners using the partner's identifier or type, then use Loan.LoanAmount instead of Loan.AdjustedLoanAmount for those specific partners.

Are there any test cases we should update to reflect this change in calculation?

---

**User**:

Yes, update existing tests for Moment/LTHFS purchases

---

**AI Analyst**:

Based on our discussion, I can summarize the requirements for this ticket:

1. We need to modify the CalculatePurchaseAmount method in PurchaseService.cs within the COS.Lending.Selling.WebApi repository.

2. The change involves using the loan amount (Loan.LoanAmount) instead of the adjusted loan amount (Loan.AdjustedLoanAmount) specifically for Moment/LTHFS partner purchases.

3. The implementation should include a conditional check to only apply this change to Moment/LTHFS partners, leaving the calculation unchanged for other partners.

4. Existing unit tests for Moment/LTHFS purchases will need to be updated to reflect this calculation change.

5. The purpose of this change is to align our calculations more closely with the numbers expected by Moment/LTHFS, as referenced in the original ticket.

This change should help resolve the discrepancies mentioned in the ticket and improve the accuracy of purchase calculations for these specific partners.