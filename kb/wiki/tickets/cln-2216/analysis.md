# CLN-2216: Moment/LTHFS process.  Difference in money and loans — Analysis

*Completed: 2026-04-13T12:57:40.462Z*

## Summary

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

## Key Decisions

**Q:** Based on my exploration of the codebase, I found the core issue. The loan purchase logic in `PurchaseAction.fs` currently uses `adjustedLoanAmount` (servicing-adjusted) for LTHFS loans, but the ticket indicates it should use `loanAmount` (original loan amount) for Moment/LTHFS.
**A:** Only Momnt LTHFS loans

**Q:** Now let me confirm which amount field to use. Looking at the Loan entity, I see three distinct amount fields:
**A:** LoanAmount (original loan amount from origination)

**Q:** I see that `PassThroughInterest` calculations use `adjustedLoanAmount` as the principal basis. This is important to understand.
**A:** Yes - only change the purchase principal transfer amount

---

> Raw transcript: [analyze.md](../../raw/transcripts/cln-2216/analyze.md)