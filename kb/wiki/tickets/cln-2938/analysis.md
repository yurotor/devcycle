# CLN-2938: Disable Confirm Purchase button on NSF — Analysis

*Completed: 2026-04-13T15:55:20.852Z*

## Summary

Perfect! I have all the information needed.

---

## ****

# Requirements & Technical Analysis Summary
## CLN-2938: Disable Confirm Purchase Button on NSF

### 📋 Requirements Summary

**User Story**: As a user attempting to purchase loans, I should not be able to confirm a purchase when there are insufficient funds in the account(s), to prevent failed transactions and backend errors.

**Acceptance Criteria**:
1. ✅ Disable "Confirm" button in purchase modal when NSF is detected
2. ✅ Apply validation to both single investor and multiple investor scenarios
3. ✅ Show clear error message with account balance vs required amount
4. ✅ Disable button during loading/error states for safety
5. ✅ Dynamically update validation when user selects different purchase accounts
6. ✅ Use red text with warning icon (⚠️) for error message

---

### 🔧 Technical Implementation Plan

#### **File to Modify**:
`/home/ukeselman/workspace/COS.Lending.Selling.UI/src/components/loans/main/table-bottom.tsx`

#### **Changes Required**:

**1. Add NSF Validation Logic**
```typescript
// Helper function to determine if there are insufficient funds
const hasInsufficientFunds = (): boolean => {
  if (!totalAmount) return false; // Can't determine yet
  
  if (hasInvestorFilter) {
    // Single account scenario
    if (accountBalanceData === undefined || isAccountBalanceError) return true;
    return accountBalanceData < totalAmount;
  } else {
    // Multiple accounts scenario - sum all balances
    if (!accountsBalancesData || isAccountsBalancesError) return true;
    const totalBalance = accountsBalancesData.reduce((sum, acc) => sum + acc.balance, 0);
    return totalBalance < totalAmount;
  }
};
```

**2. Modify Button Disable Logic**
Update `ModalActionButtons` to disable the "Yes" button when:
- Loading states are active
- NSF is detected
- Errors exist

```typescript
<ModalActionButtons
  onCancel={handleModalClose}
  onYes={handleConfirmPurchase}
  yesText={t('loans_table_bottom.confirm')}
  cancelText={t('common.cancel')}
  disableYes={
    !totalAmount || 
    isAccountBalanceLoading || 
    isAccountsBalancesLoading || 
    hasInsufficientFunds()
  }
/>
```

**3. Add Error Message Component**
After the account balance row (line 257), conditionally render error message:

```tsx
{hasInsufficientFunds() && totalAmount && (
  <StyledRow>
    <span></span>
    <StyledErrorMessage>
      ⚠️ Insufficient funds. Account balance 
      ({formatNumber(
        hasInvestorFilter 
          ? accountBalanceData || 0 
          : accountsBalancesData?.reduce((sum, acc) => sum + acc.balance, 0) || 0,
        { prefix: '$', decimal: 2 }
      )}) 
      is less than required amount ({formatNumber(totalAmount, { prefix: '$', decimal: 2 })}).
    </StyledErrorMessage>
  </StyledRow>
)}
```

**4. Add Styled Component**
```typescript
const StyledErrorMessage = styled.span`
  color: #d32f2f;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  gap: 4px;
`;
```

---

### 🔍 Key Technical Details

**Backend NSF Validation** (already exists):
- Location: `/home/ukeselman/workspace/COS.Lending.Selling.WebApi/CRB.Cos.Lending.Selling.BusinessLogic/PurchaseLoans.fs:71-160`
- Function: `getInsufficientFundsAccounts` and `checkAccounts`
- Returns error: `"Insufficient funds accounts: {accountNumbers}"`
- This change adds **frontend prevention** to complement existing backend validation

**Data Flow**:
1. User clicks "Purchase Loans" button → Modal opens
2. `fetchTotalAmount()` and `fetchAccountsBalances()` called
3. NSF validation runs whenever data updates (totalAmount, balances, selected account)
4. Button disabled + error shown if NSF detected
5. If user proceeds (sufficient funds), backend validates again before processing

**Edge Cases Handled**:
- ✅ Loading states (undefined data)
- ✅ Error states (API failures)
- ✅ Single vs multiple accounts
- ✅ Purchase account dropdown changes
- ✅ Default vs custom account selection

---

### 📊 Impact Analysis

**User Experience**:
- ✅ Prevents frustration from failed purchase attempts
- ✅ Clear feedback on why purchase can't proceed
- ✅ Shows exact amounts for transparency

**System Impact**:
- ✅ Reduces backend errors and failed transactions
- ✅ No API changes required
- ✅ Minimal performance impact (client-side validation)

**Testing Requirements**:
1. Single investor with sufficient funds → Button enabled
2. Single investor with NSF → Button disabled + error shown
3. Multiple investors with sufficient total → Button enabled
4. Multiple investors with NSF → Button disabled + error shown
5. Loading states → Button disabled
6. Purchase account dropdown → Dynamic validation
7. Error states → Button disabled

---

### 🎯 Implementation Estimate
- **Complexity**: Low
- **LOC Changed**: ~50-60 lines
- **Files Modified**: 1 file
- **Dependencies**: None (uses existing APIs)
- **Risk**: Low (purely additive UI change)

## Key Decisions

**Q:** Perfect! I've explored the codebase and found:
**A:** Disable for both single and multiple account scenarios

**Q:** Perfect! We'll disable the button in both scenarios.
**A:** Option A: Sum all balances and compare to total

**Q:** Excellent! We'll sum all account balances and compare to the total amount.
**A:** Show error message below balance row (recommended)

**Q:** Perfect! We'll add a clear error message below the balance row.
**A:** Disable button during loading/errors + NSF (recommended)

**Q:** ## Fifth Question: Purchase Account Selection Impact
**A:** Yes, dynamically update validation when account changes (recommended)

**Q:** Perfect! The validation will update dynamically.
**A:** Hardcode English message (faster, no translation needed)

**Q:** Perfect! We'll use hardcoded English messages.
**A:** Red text with warning icon (⚠️) - moderate prominence (recommended)

---

> Raw transcript: [analyze.md](../../raw/transcripts/cln-2938/analyze.md)