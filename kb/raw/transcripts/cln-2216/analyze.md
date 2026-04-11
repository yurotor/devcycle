# Analysis Transcript — CLN-2216: Moment/LTHFS process.  Difference in money and loans

*Generated: 2026-04-11T15:15:47.592Z*

---

**User**:

Here's the ticket: "Moment/LTHFS process.  Difference in money and loans". Hi.    See belowWe should be using the loan amount for the draw, not the adjusted loan amount, for the purchaseThis should get us closer to matching to their numbersCopy of 20250902 SG LS68.xlsxsublines_to_end_seasoning.csv

---

**AI Analyst**:

I'll help analyze this requirement. It appears to relate to how loan amounts are calculated for purchases, specifically changing from using adjusted loan amounts to the original loan amount for draws in the Moment/LTHFS process.

First, I need to understand which services/repositories are affected by this change.

My recommendation: This likely involves the loan purchase processing logic in COS.Lending.Selling.WebApi and potentially data processing in cos-lending-selling-datatools or cos-lending-selling-dags.

Which system(s) or repository(ies) are primarily involved in processing Moment/LTHFS loan purchases?

---

**User**:

COS.Lending.Selling.WebApi

---

**AI Analyst**:

Thank you for confirming. Now I need to understand the specific components within COS.Lending.Selling.WebApi that handle the draw amount calculations for Moment/LTHFS purchases.

My recommendation: This change likely involves modifying a purchase service or calculation service that determines draw amounts during the loan purchase process.

Which specific service or component in COS.Lending.Selling.WebApi calculates the draw amounts for Moment/LTHFS purchases?

---

**User**:

PurchaseService

---

**AI Analyst**:

Thank you for confirming that PurchaseService is involved. Now I need to understand the specific fields or properties that need to be modified to use the loan amount instead of adjusted loan amount.

My recommendation: We need to modify the PurchaseService to use a LoanAmount property instead of AdjustedLoanAmount for calculating the draw during purchases.

Could you confirm what field is currently being used for the draw calculation and what field should be used instead?

---

**User**:

Currently uses AdjustedLoanAmount, should use LoanAmount

---

**AI Analyst**:

Thank you for confirming. Now I need to understand the scope of this change and any dependencies it might affect.

My recommendation: This appears to be a targeted change in the PurchaseService to replace AdjustedLoanAmount with LoanAmount for draw calculations specifically for Moment/LTHFS processes.

Is this change specific to only Moment/LTHFS purchases, or should it apply to all loan purchases in the system?

---

**User**:

Yes

---

**AI Analyst**:

I need to clarify your response. When you say "Yes", does that mean this change should apply specifically to only Moment/LTHFS purchases, or should it apply to all loan purchases in the system?

My recommendation: Based on the ticket mentioning "Moment/LTHFS process" specifically, this change should likely be limited to only Moment/LTHFS purchases.

---

**User**:

Only Moment/LTHFS purchases

---

**AI Analyst**:

## Analysis Summary

Based on our discussion, I understand the requirements for ticket CLN-2216 as follows:

1. **Issue**: There's a discrepancy between expected and actual financial calculations in the Moment/LTHFS loan purchase process.

2. **Root Cause**: The system is currently using the adjusted loan amount instead of the original loan amount for calculating draws during purchases.

3. **Required Change**: Modify the PurchaseService in COS.Lending.Selling.WebApi to use the LoanAmount field instead of AdjustedLoanAmount field specifically for Moment/LTHFS purchases.

4. **Scope**: This change applies only to Moment/LTHFS purchases and does not affect other loan purchase processes.

5. **Expected Outcome**: Using the loan amount for the draw calculation should bring the numbers closer to Moment/LTHFS's expected values, resolving the discrepancy noted in the ticket.

The implementation will require targeted changes to the draw calculation logic in PurchaseService with conditional handling to ensure this modification only affects Moment/LTHFS purchases.