# Analysis Transcript — CLN-2938: Disable Confirm Purchase button on NSF

*Generated: 2026-04-13T15:55:20.852Z*

---

**User**:

Here's the ticket: "Disable Confirm Purchase button on NSF". Currently user can confirm purchase even on NSF, we need to disable the Confirm Purchase button on NSF.

---

**AI Analyst**:

Perfect! I've explored the codebase and found:

1. **Backend**: In `PurchaseLoans.fs` (lines 71-160), there's already NSF validation that checks if `accountBalance < requiredAmount` and returns an error "Insufficient funds accounts: ..."
2. **UI**: In `table-bottom.tsx`, the purchase confirmation modal displays both `totalAmount` (purchase amount) and account balance, but currently allows users to click "Confirm Purchase" even when NSF exists - the validation only happens after submission.

Now let's begin the requirements interview:

## First Question: Scope & Behavior

Looking at the purchase modal in `table-bottom.tsx`, I can see it handles two scenarios:
- **Single investor filter**: Shows one account balance (`accountBalanceData`)
- **Multiple investors/accounts**: Shows aggregated balance info (`accountsBalancesData`)

**Question**: Should we disable the Confirm Purchase button in BOTH scenarios (single account AND multiple accounts), or only when a single account is selected?

**My recommendation**: Disable in both scenarios. For single account, compare `totalAmount` vs `accountBalanceData`. For multiple accounts, we should either:
  - Show an error message if ANY account has NSF, OR
  - Only allow purchase if ALL required accounts have sufficient funds

**Which approach do you prefer?**

---

**User**:

Disable for both single and multiple account scenarios

---

**AI Analyst**:

Perfect! We'll disable the button in both scenarios.

## Second Question: Multiple Accounts Logic

Looking at the code, when there's no investor filter selected (multiple accounts case), the API returns `accountsBalancesData: AccountBalanceInfo[]` where each item has:
```typescript
{
  accountNumber: string;
  name: string;
  balance: number;
}
```

Currently, the UI shows "Multiple Accounts" as the label when `accountsBalancesData.length > 1`.

**Question**: For the multiple accounts scenario, how should we determine if there are insufficient funds?

**Analysis**: The backend (PurchaseLoans.fs:71-97) already validates NSF by checking each account's required debit amount against its balance. However, the UI doesn't know the per-account required amounts - it only knows:
- Total purchase amount (`totalAmount`)
- Each account's current balance (`accountsBalancesData[].balance`)

**My recommendation**: 
- **Option A**: Check if the SUM of all account balances >= totalAmount (assumes funds can be pulled from multiple accounts)
- **Option B**: Require that at LEAST ONE account has balance >= totalAmount (single account must cover full purchase)
- **Option C**: Fetch per-account required amounts from backend and validate each individually (most accurate, but requires new API)



**Which validation logic makes the most business sense for your purchase workflow?**

---

**User**:

Option A: Sum all balances and compare to total

---

**AI Analyst**:

Excellent! We'll sum all account balances and compare to the total amount.

## Third Question: User Feedback & Error Messaging

Currently, the modal shows both the total amount and account balance(s), but there's no explicit error message when NSF exists.

**Question**: When the Confirm Purchase button is disabled due to NSF, how should we communicate this to the user?

**Current UI state**: 
- The modal shows `Total: $X` and `Account Balance: $Y` side-by-side
- Button can be disabled (via the `disabled` prop)
- No error message is currently displayed

**My recommendation**: Show a clear error message below the account balance row when NSF is detected, such as:
```
⚠️ Insufficient funds. Account balance ($Y) is less than required amount ($X).
```

**Options**:


**What level of user feedback do you want?**

---

**User**:

Show error message below balance row (recommended)

---

**AI Analyst**:

Perfect! We'll add a clear error message below the balance row.

## Fourth Question: Loading States & Edge Cases

Looking at the code, I notice several edge cases where data might not be available:

**Current states**:
- `totalAmount` can be `undefined` (still loading)
- `accountBalanceData` can be `undefined` or in error state (`isAccountBalanceError`)
- `accountsBalancesData` can be `undefined`, empty `[]`, or in error state (`isAccountsBalancesError`)

**Question**: How should we handle the Confirm Purchase button when data is still loading or unavailable?

**Current behavior**: Button is enabled/disabled based on `shouldDisplayPurchaseButton` prop (from parent), but the modal doesn't independently check loading states.

**My recommendation**: Disable the Confirm Purchase button if:
- Total amount is still loading (`totalAmount === undefined`), OR
- Account balance is still loading (`isAccountBalanceLoading` or `isAccountsBalancesLoading`), OR  
- There's an error fetching balance data, OR
- NSF condition is detected



**Should we be defensive and disable during all uncertainty states, or only on confirmed NSF?**

---

**User**:

Disable button during loading/errors + NSF (recommended)

---

**AI Analyst**:

## Fifth Question: Purchase Account Selection Impact

I notice there's a **purchase account dropdown** (lines 259-282) that appears when multiple purchase accounts are available. When a user selects a different account from this dropdown:

**Current behavior** (line 123-126):
```typescript
const handlePurchaseAccountChange = (accountNumber: string | null) => {
  const newAccountNumber = accountNumber || 'default';
  setSelectedAccountNumber(newAccountNumber);
  fetchAccountBalanceForAccount(newAccountNumber); // Re-fetches balance
};
```

**Question**: When the user changes the selected purchase account via the dropdown, should the NSF validation and error message update dynamically based on the newly selected account's balance?

**Scenario example**:
- Total amount: $100,000
- Default account balance: $50,000 (NSF - button disabled)
- User selects "Account XYZ" from dropdown  
- Account XYZ balance: $150,000 (sufficient - button enabled)

**My recommendation**: Yes, dynamically re-validate as the account balance changes. The button state and error message should update in real-time as the user explores different purchase accounts.



**Should the NSF check adapt to the selected purchase account?**

---

**User**:

Yes, dynamically update validation when account changes (recommended)

---

**AI Analyst**:

Perfect! The validation will update dynamically.

## Sixth Question: Error Message Wording & Translations

Looking at the codebase, I see the UI uses the `useCrbTranslation()` hook with translation keys like:
- `t('loans_table_bottom.purchase_summary')`
- `t('loans_table_bottom.confirm')`

**Question**: What should the exact wording of the NSF error message be, and should we add it to the translation system?

**Context**: 
- **Single investor**: "Insufficient funds. Account balance ($Y) is less than required amount ($X)."
- **Multiple investors**: "Insufficient funds. Total account balances ($Y) is less than required amount ($X)."

**My recommendation**: Add a new translation key `loans_table_bottom.insufficient_funds` with placeholders for the amounts, so it can be localized.

**Options**:


**Do you want proper i18n support for this error message?**

---

**User**:

Hardcode English message (faster, no translation needed)

---

**AI Analyst**:

Perfect! We'll use hardcoded English messages.

## Final Question: Error Message Styling

**Question**: How prominent should the NSF error message be visually?

**Context**: The modal currently has a clean, simple layout with label-value rows. We need to add an error message that's noticeable but doesn't break the design.

**My recommendation**: Use a warning style with:
- Red or orange text color (`#d32f2f` or similar)
- Warning icon (⚠️ or similar)
- Placed directly below the account balance row
- Font size consistent with other modal text (`1.4rem`)

**Example styling**:
```
Account Balance: $50,000
⚠️ Insufficient funds. Account balance ($50,000) is less than required amount ($100,000).
[styled in red, slightly smaller or same font size]
```

**Options**:


**What level of visual prominence works best for your UI?**

---

**User**:

Red text with warning icon (⚠️) - moderate prominence (recommended)

---

**AI Analyst**:

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