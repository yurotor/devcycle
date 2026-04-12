# Analysis Transcript — CLN-2216: Moment/LTHFS process.  Difference in money and loans

*Generated: 2026-04-12T07:38:26.298Z*

---

**User**:

Here's the ticket: "Moment/LTHFS process.  Difference in money and loans". Hi.    See belowWe should be using the loan amount for the draw, not the adjusted loan amount, for the purchaseThis should get us closer to matching to their numbersCopy of 20250902 SG LS68.xlsxsublines_to_end_seasoning.csv

---

**AI Analyst**:

I need to understand the specifics of this ticket related to the Moment/LTHFS process and the loan amount discrepancy. Let me start with clarifying which system or repository this change applies to.

Based on the context, this appears to be related to loan purchases and draws in the selling system, possibly affecting how we calculate amounts for purchases from the Moment/LTHFS marketplace lender.

My recommendation: This likely impacts the COS.Lending.Selling.WebApi repository, which handles loan purchasing and associated financial transfers.

Which repository or service contains the code that needs to be modified for this change?

---

**User**:

COS.Lending.Selling.WebApi

---

**AI Analyst**:

Thanks for confirming we're working with COS.Lending.Selling.WebApi. Now let's pinpoint the specific process that needs modification related to Moment/LTHFS.

Based on the ticket, there appears to be a discrepancy between using the loan amount versus the adjusted loan amount during the draw/purchase process, which is causing numerical differences.

My recommendation: This likely involves modifying the loan purchase service or controller that handles draw calculations for Moment/LTHFS.

Which specific component or class in the WebApi handles the draw calculation for Moment/LTHFS purchases?

---

**User**:

LoanPurchaseService

---

**AI Analyst**:

Thank you. Now I understand we need to modify the LoanPurchaseService in the COS.Lending.Selling.WebApi repository. Let's get more specific about the exact change needed.

Currently, it seems the system is using the adjusted loan amount for calculating draws during the purchase process for Moment/LTHFS loans, but it should be using the original loan amount instead.

My recommendation: We should modify the draw calculation logic in LoanPurchaseService to use the loan amount field instead of the adjusted loan amount when processing Moment/LTHFS loans.

Is this change specific only to Moment/LTHFS loans, or should it apply to all loan purchases in the system?

---

**User**:

Yes

---

**AI Analyst**:

I need to clarify your answer. When you say "yes," does that mean this change should only apply to Moment/LTHFS loans specifically, or should it apply to all loan purchases in the system?

My recommendation: Based on the ticket mentioning "Moment/LTHFS process" specifically, I believe this change should only apply to Moment/LTHFS loans and not all loans in the system.

---

**User**:

Only apply to Moment/LTHFS loans

---

**AI Analyst**:

Thanks for confirming. Let's nail down the implementation approach for this change.

Since this change should only apply to Moment/LTHFS loans, we'll need to add conditional logic in the LoanPurchaseService to check if a loan is from Moment/LTHFS before using the loan amount instead of the adjusted loan amount for the draw calculation.

My recommendation: Add a conditional check in the relevant method of LoanPurchaseService that identifies Moment/LTHFS loans (perhaps by originator ID or loan program) and uses the loan amount instead of adjusted loan amount specifically for these loans.

Do we need to modify any database tables or models as part of this change, or is this purely a code logic change?

---

**User**:

Purely code logic change - no DB changes needed

---

**AI Analyst**:

Based on our discussion, I can summarize the requirements for this ticket:

1. **Problem**: Currently, the system is using the adjusted loan amount instead of the original loan amount for draws during the purchase process for Moment/LTHFS loans, causing numerical discrepancies compared to their expected numbers.

2. **Solution**: We need to modify the LoanPurchaseService in the COS.Lending.Selling.WebApi repository to use the loan amount (original) rather than the adjusted loan amount specifically for Moment/LTHFS loans.

3. **Scope**: This change should only be applied to Moment/LTHFS loans, requiring conditional logic to identify these specific loans in the purchase process.

4. **Implementation Details**:
   - This is purely a code logic change with no database modifications required
   - The change will involve adding conditional logic in LoanPurchaseService to check if a loan is from Moment/LTHFS
   - For Moment/LTHFS loans, use the loan amount field for draw calculations
   - For all other loans, continue using the current adjusted loan amount logic

This focused change should help align our calculations with Moment/LTHFS's expected numbers as mentioned in the ticket description.