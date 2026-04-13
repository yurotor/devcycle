# Analysis Transcript — CLN-2216: Moment/LTHFS process.  Difference in money and loans

*Generated: 2026-04-13T12:57:40.462Z*

---

**User**:

Here's the ticket: "Moment/LTHFS process.  Difference in money and loans". Hi.    See belowWe should be using the loan amount for the draw, not the adjusted loan amount, for the purchaseThis should get us closer to matching to their numbersCopy of 20250902 SG LS68.xlsxsublines_to_end_seasoning.csv

---

**AI Analyst**:

Based on my exploration of the codebase, I found the core issue. The loan purchase logic in `PurchaseAction.fs` currently uses `adjustedLoanAmount` (servicing-adjusted) for LTHFS loans, but the ticket indicates it should use `loanAmount` (original loan amount) for Moment/LTHFS.

**Question 1: Scope of the change - Which MPL(s) and loan types should be affected?**

The ticket specifically mentions "Moment/LTHFS process" but the current code logic applies to all LTHFS loans regardless of MPL. I can see three distinct amount fields:
- `loanAmount` - original loan amount from origination
- `adjustedLoanAmount` - updated by servicing data from MPL
- `loanAmountFunded` - actual funded amount

Currently (PurchaseAction.fs, line 195):
- HFS loans with `useNetFundingAsSource=true` → uses `loanAmountFunded`
- All other cases (including ALL LTHFS) → uses `adjustedLoanAmount`

**My recommendation:** This change should only apply to **Momnt MPL + LTHFS loan type combination**, not all LTHFS loans. Other MPLs may legitimately expect adjusted loan amounts to be used. This would require adding MPL-specific logic to the purchase amount calculation.

Should this change apply to:
1. **Only Momnt LTHFS loans** (targeted fix)
2. **All LTHFS loans regardless of MPL** (broad fix)
3. **Some specific set of MPLs** (if multiple MPLs have this requirement)

---

**User**:

Only Momnt LTHFS loans

---

**AI Analyst**:

Now let me confirm which amount field to use. Looking at the Loan entity, I see three distinct amount fields:

1. **`LoanAmount`** - Original loan amount at origination (from Arix)
2. **`AdjustedLoanAmount`** - Updated amount from MPL servicing data (can change over time)
3. **`LoanAmountFunded`** - The actual funded amount

The ticket says: *"We should be using the loan amount for the draw, not the adjusted loan amount"*

Currently, the purchase logic uses:
- **HFS + useNetFundingAsSource** → `loanAmountFunded`
- **All other cases (including LTHFS)** → `adjustedLoanAmount`

**Question 2: Which amount field should be used for Momnt LTHFS loan purchases?**

Based on the ticket description "loan amount for the draw, not the adjusted loan amount", my recommendation is to use **`LoanAmount`** (the original loan amount from origination), as this represents the initial "draw" amount rather than the servicing-adjusted balance.

However, there's a nuance: the term "draw" might also refer to the funded amount. Can you confirm which field represents the amount that should be transferred during purchase?

---

**User**:

LoanAmount (original loan amount from origination)

---

**AI Analyst**:

I see that `PassThroughInterest` calculations use `adjustedLoanAmount` as the principal basis. This is important to understand.

**Question 3: Should interest calculations and other operations continue to use `adjustedLoanAmount` (servicing balance), or should they also switch to `loanAmount`?**

My recommendation: **Interest calculations should continue using `adjustedLoanAmount`** (the servicing-adjusted balance) because interest accrues on the current outstanding loan balance, not the original loan amount. The ticket specifically mentions "the loan amount for **the draw**" (the purchase principal transfer), not interest calculations.

This means:
- **Purchase principal transfer** → change to use `loanAmount` for Momnt LTHFS
- **Interest calculations** → keep using `adjustedLoanAmount` (actual balance)
- **Invoices/receipts** → already use `loanAmount`, will stay consistent

Is this understanding correct?

---

**User**:

Yes - only change the purchase principal transfer amount

---

**AI Analyst**:

Perfect! I now have all the information needed to implement this fix. Let me provide a complete summary:

---

## ****

### **Ticket Summary**
**CLN-2216**: Momnt/LTHFS loans should use the original loan amount (not adjusted loan amount) for purchase principal transfers to match their accounting numbers.

### **Root Cause**
The purchase logic in `PurchaseAction.fs` (line 189-216) currently uses `adjustedLoanAmount` for all LTHFS loans. For Momnt specifically, this creates a discrepancy because they expect the original loan amount to be transferred during purchase, not the servicing-adjusted balance.

### **Implementation Plan**

**File to modify**: `/home/ukeselman/workspace/devcycle/kb/repos/COS.Lending.Selling.WebApi/CRB.Cos.Lending.Selling.Model/PurchaseAction.fs`

**Function**: `createPrincipal` (lines 189-216)

**Current logic**:
```fsharp
let amount =
    if loan.useNetFundingAsSource && loan.loanType = LoanType.HFS
    then loan.loanAmountFunded
    else loan.adjustedLoanAmount
```

**New logic**:
```fsharp
let amount =
    if loan.useNetFundingAsSource && loan.loanType = LoanType.HFS
    then loan.loanAmountFunded
    elif loan.loanType = LoanType.LTHFS && loan.mplId = "MMT"
    then loan.loanAmount
    else loan.adjustedLoanAmount
```

### **Key Decisions**
1. ✅ **Scope**: Only Momnt (MPL ID = `"MMT"`) LTHFS loans
2. ✅ **Amount field**: Use `loanAmount` (original loan amount from origination)
3. ✅ **Change scope**: Only purchase principal transfer amount
4. ✅ **Unchanged**: Interest calculations, pass-through interest, invoices/receipts remain using their current logic

### **Impact Assessment**
- **Low risk**: Targeted change affecting only Momnt LTHFS purchases
- **No downstream changes needed**: Invoices/receipts already use `loanAmount` field
- **Interest calculations unaffected**: Continue using `adjustedLoanAmount` as appropriate
- **Testing required**: Verify Momnt LTHFS purchase transfers use correct amount

Should I proceed with implementing this change?