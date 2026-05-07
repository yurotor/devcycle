# PRD: Disable Confirm Purchase Button on NSF (CLN-2938)

## Problem Statement

Currently, users can click the "Confirm Purchase" button in the loan purchase modal even when their account(s) have insufficient funds (NSF). The validation only occurs after submission on the backend (`PurchaseLoans.fs:147-160`), resulting in a failed transaction and error message: "Insufficient funds accounts: {accountNumbers}". This creates a poor user experience where users:

1. **Experience unnecessary friction**: Users must wait for backend processing only to receive an error they could have been warned about upfront
2. **Lack visibility into the problem**: The modal displays both total purchase amount and account balance side-by-side, but doesn't explicitly indicate when funds are insufficient
3. **Waste time troubleshooting**: Users may retry the purchase multiple times before realizing the account lacks sufficient funds

This affects both single-investor purchases (where one account balance is shown) and multi-investor purchases (where multiple account balances are aggregated).

## Solution

Implement client-side NSF validation in the purchase confirmation modal (`table-bottom.tsx`) that prevents users from confirming a purchase when insufficient funds are detected. The solution provides:

1. **Proactive prevention**: The "Confirm Purchase" button is disabled when NSF is detected, preventing failed transactions
2. **Clear feedback**: A prominent error message displays below the account balance row, showing:
   - Current account balance (or sum of multiple account balances)
   - Required purchase amount
   - Clear indication that funds are insufficient
3. **Real-time validation**: The button state and error message update dynamically as data loads or when the user selects different purchase accounts from the dropdown
4. **Defensive UX**: The button is also disabled during loading states and API errors to prevent premature submissions

This complements the existing backend validation (which remains as a safety net) while improving user experience by catching NSF issues before submission.

## User Stories

### Happy Path - Sufficient Funds
1. As a loan operations user with sufficient account balance, I want the Confirm Purchase button to be enabled, so that I can complete my purchase without friction
2. As a user with multiple accounts where the sum of balances exceeds the purchase amount, I want the button enabled, so that I can leverage funds across accounts

### NSF Detection - Single Account
3. As a user purchasing loans with a single investor filter selected, I want the system to compare my account balance against the total purchase amount, so that I know immediately if I have insufficient funds
4. As a user viewing the purchase modal with NSF, I want to see a clear error message stating "⚠️ Insufficient funds. Account balance ($X) is less than required amount ($Y)", so that I understand why I cannot proceed
5. As a user with NSF, I want the Confirm Purchase button disabled, so that I cannot attempt a transaction that will fail

### NSF Detection - Multiple Accounts
6. As a user purchasing loans without an investor filter (multiple accounts), I want the system to sum all account balances and compare against the total, so that it accurately reflects my total purchasing power
7. As a user with multiple accounts where the total balance is insufficient, I want to see an error message showing the aggregated balance vs required amount, so that I understand the shortfall across all accounts
8. As a user with multiple accounts showing NSF, I want the button disabled until I resolve the funding issue, so that I don't waste time on failed transactions

### Dynamic Validation - Purchase Account Selection
9. As a user selecting different purchase accounts from the dropdown, I want the NSF validation to re-check against the newly selected account's balance, so that I can explore which accounts have sufficient funds
10. As a user switching from an NSF account to an account with sufficient funds, I want the error message to disappear and the button to become enabled, so that I can proceed with the purchase
11. As a user with a custom purchase account configured, I want NSF validation to apply to that specific account when selected, so that the validation is accurate for my chosen funding source

### Loading and Error States
12. As a user waiting for account balance data to load, I want the Confirm Purchase button disabled, so that I cannot submit before the system knows if I have sufficient funds
13. As a user whose account balance failed to load due to an API error, I want the button disabled, so that I cannot proceed without knowing my available balance
14. As a user whose total purchase amount is still calculating, I want the button disabled, so that validation doesn't run on incomplete data
15. As a user experiencing backend errors, I want clear feedback (button disabled, loading indicators), so that I know the system is protecting me from bad actions

### Edge Cases
16. As a user with exactly equal balance to purchase amount ($X = $X), I want the button enabled (no NSF), so that I can use 100% of my available funds
17. As a user with account balance data that returns empty results, I want the button disabled and an error state, so that I don't proceed without proper account information
18. As a user switching between default and custom purchase accounts during multiple interactions, I want validation to remain accurate across all transitions, so that button state always reflects current reality

### Error Message Display
19. As a user viewing the NSF error message, I want it styled in red text with a warning icon (⚠️), so that it stands out as a critical issue requiring attention
20. As a user reading the error message, I want exact dollar amounts formatted with currency symbols and two decimal places, so that I can easily understand the specific funding gap
21. As a user with multiple accounts, I want the error message to reference "Total account balances" (plural), so that I understand it's summing across accounts
22. As a user with a single investor filter, I want the error message to reference "Account balance" (singular), so that the language matches the single-account context

### System Reliability
23. As a developer, I want NSF validation to be purely client-side (no new API calls), so that we don't add latency or new failure points
24. As a developer, I want the backend NSF validation (`PurchaseLoans.fs:147-160`) to remain in place, so that we have defense-in-depth even if client validation is bypassed
25. As a QA engineer, I want clear test scenarios covering all loading/error/NSF combinations, so that I can validate the feature thoroughly

## Implementation Decisions

### Frontend Changes (COS.Lending.Selling.UI)
- **Module**: `src/components/loans/main/table-bottom.tsx`
  - Add new helper function `hasInsufficientFunds()` that returns boolean indicating NSF condition
  - Logic for single account: `accountBalanceData < totalAmount`
  - Logic for multiple accounts: `sum(accountsBalancesData[].balance) < totalAmount`
  - Handle edge cases: return `true` (disable button) if data is undefined or in error state
- **Button Disable Logic**: Modify `ModalActionButtons` component's `disableYes` prop to include:
  - `!totalAmount` (total not loaded)
  - `isAccountBalanceLoading || isAccountsBalancesLoading` (data loading)
  - `isAccountBalanceError || isAccountsBalancesError` (API errors)
  - `hasInsufficientFunds()` (NSF detected)
- **Error Message Component**: Add new styled component `StyledErrorMessage` with:
  - Red text color (`#d32f2f`)
  - Warning emoji prefix (⚠️)
  - Font size consistent with modal content (`1.4rem`)
  - Flexbox layout for icon + text alignment
- **Error Message Rendering**: Conditionally render error message in a new `StyledRow` below the account balance row (after line 257)
  - Only show when `hasInsufficientFunds()` returns true AND `totalAmount` is defined
  - Message format for single account: `"⚠️ Insufficient funds. Account balance ($X) is less than required amount ($Y)."`
  - Message format for multiple accounts: `"⚠️ Insufficient funds. Total account balances ($X) is less than required amount ($Y)."`
  - Use `formatNumber()` utility with `{ prefix: '$', decimal: 2 }` for currency formatting

### Integration Points
- **Data Dependencies**: Relies on existing data fetched by parent component:
  - `totalAmount` (from `fetchTotalAmount` API call)
  - `accountBalanceData` (from `fetchAccountBalance` for single investor)
  - `accountsBalancesData` (from `fetchAccountsBalances` for multiple investors)
  - Loading and error states (`isAccountBalanceLoading`, `isAccountsBalancesError`, etc.)
- **User Interaction Flow**:
  1. User clicks "Purchase Loans" button → Modal opens
  2. `handleRequestPurchase()` triggers API calls to fetch total amount and account balances
  3. Data populates → NSF validation runs automatically
  4. If NSF detected → Button disabled + error message shown
  5. User selects different purchase account via dropdown → `handlePurchaseAccountChange()` re-fetches balance → Validation re-runs
  6. When sufficient funds detected → Button enabled + error hidden

### No Backend Changes Required
- **Existing NSF Validation**: Backend logic in `CRB.Cos.Lending.Selling.BusinessLogic/PurchaseLoans.fs` (lines 71-160) remains unchanged
  - `getInsufficientFundsAccounts()` function already validates each account's required debit amount vs balance
  - `checkAccounts()` function returns error: `"Insufficient funds accounts: {accountNumbers}"`
- **Defense in Depth**: Frontend validation acts as a user experience improvement; backend validation remains the authoritative check for security and data integrity

### Architectural Decisions
- **No New APIs**: Use existing API responses (`/api/loans/HFS/total`, `/api/loans/HFS/accounts/balances`, `/api/loans/HFS/accounts/balance`) without modifications
- **Client-Side Validation Only**: All NSF logic executes in the browser; no server-side changes to validation timing
- **No Translation Keys**: Error messages hardcoded in English (not added to i18n system) per interview decision
- **Reactive Validation**: Validation logic runs automatically when dependent data changes (React component re-renders on state/prop updates)

## Testing Decisions

### Unit Testing (COS.Lending.Selling.UI)
- **Test File**: Create or extend tests for `table-bottom.tsx` component
- **Key Test Scenarios**:
  1. **Single account with sufficient funds**: Verify button enabled, no error message
  2. **Single account with NSF**: Verify button disabled, error message shown with correct amounts
  3. **Multiple accounts with sufficient total**: Sum balances, verify button enabled
  4. **Multiple accounts with NSF**: Sum balances, verify button disabled with "Total account balances" wording
  5. **Loading state (totalAmount undefined)**: Verify button disabled
  6. **Loading state (balances loading)**: Verify button disabled
  7. **Error state (balance API failed)**: Verify button disabled
  8. **Purchase account dropdown change**: Verify validation re-runs and button state updates
  9. **Edge case (balance = total)**: Verify button enabled (no NSF)
  10. **Edge case (empty accountsBalancesData)**: Verify button disabled

### Integration Testing
- **Test Environment**: Use existing e2e-tests infrastructure (`cos-lending-selling-e2e-tests`)
- **Test Scenario**: 
  1. Set up test account with specific balance (e.g., $50,000)
  2. Create loan inventory totaling more than balance (e.g., $100,000)
  3. Open purchase modal
  4. Assert: Confirm button is disabled
  5. Assert: Error message visible with correct amounts
  6. Fund the account to sufficient level
  7. Re-open modal
  8. Assert: Button enabled, no error

### Manual Testing Checklist
- Test with single investor filter (e.g., investor = "Marlette")
- Test without investor filter (multiple accounts aggregation)
- Test purchase account dropdown with multiple available accounts
- Test with mock delayed API responses (loading state validation)
- Test with mock API failures (error state validation)
- Test exact balance match (boundary condition)
- Verify error message styling (red text, warning icon, formatting)

### What Makes a Good Test
- **Isolation**: Mock API responses to control exact balance and total amount values
- **Deterministic**: Tests should not depend on real account data that could change
- **Comprehensive**: Cover all branches in `hasInsufficientFunds()` logic (single account, multiple accounts, loading, errors)
- **User-Centric**: Test from user's perspective (click button → see error) rather than testing internal functions directly

### Prior Art
- **Reference**: Existing tests in `COS.Lending.Selling.UI` for modal interactions and button state management
- **Pattern**: Follow existing test patterns for `ModalActionButtons` disabled states
- **Mocking**: Use existing patterns for mocking API responses (`fetchAccountBalance`, `fetchTotalAmount`)

## Out of Scope

### Not Included in This Change
1. **Backend NSF validation logic changes**: The existing `PurchaseLoans.fs` validation remains unchanged; no modifications to `getInsufficientFundsAccounts()` or `checkAccounts()`
2. **Per-account required amounts**: The frontend does not calculate or display how much each individual account needs to contribute (only total sum vs total required)
3. **New API endpoints**: No new backend endpoints to fetch NSF status; validation uses existing balance and total APIs
4. **Detailed funding guidance**: No recommendations on which accounts to fund or by how much
5. **Internationalization (i18n)**: Error messages hardcoded in English; no translation keys added to `useCrbTranslation()` system
6. **NSF resolution workflow**: No in-app flow to add funds or transfer between accounts
7. **Historical NSF tracking**: No logging or analytics of how often users encounter NSF
8. **Email/notification on NSF**: No automated alerts to users about insufficient funds
9. **Partial purchase option**: No ability to reduce loan selection to match available funds
10. **Credit line or overdraft suggestions**: No integration with lending products to cover shortfalls
11. **Account balance refresh button**: Users must close and re-open modal to refresh balances
12. **Real-time balance updates**: No websocket or polling to detect balance changes while modal is open

## Further Notes

### Risk Assessment
- **Low Risk**: This is a purely additive UI change with no backend modifications
- **Backward Compatible**: Existing backend validation ensures safety even if frontend validation has bugs
- **No Data Migration**: No schema changes or data transformations required

### Dependencies
- **None**: No external service dependencies; uses existing APIs already integrated
- **Team Dependencies**: Frontend team can implement independently without backend coordination

### Performance Considerations
- **Minimal Impact**: Validation is a simple arithmetic comparison running client-side
- **No Additional API Calls**: Uses data already fetched for modal display; no extra network requests
- **Negligible Render Cost**: One additional conditional render for error message

### User Communication
- **Change Log Entry**: "Purchase modal now prevents purchase confirmation when account has insufficient funds, showing clear error message"
- **No Training Required**: Feature is self-explanatory with inline error messaging
- **Documentation Update**: Update internal wiki page for loan purchase workflow to mention NSF prevention

### Future Enhancements (Not in This Ticket)
1. **Account funding integration**: Link to account management page to add funds
2. **Smart purchase suggestions**: Automatically reduce loan selection to match available balance
3. **Multi-currency support**: Handle NSF validation for loans in different currencies
4. **Approval workflow bypass**: Allow certain admin roles to override NSF check for special cases
5. **Balance reservation**: Temporarily reserve funds when modal opens to prevent race conditions
6. **NSF analytics dashboard**: Track NSF occurrence rates by MPL, investor, and loan type to identify systemic funding issues

### Related Tickets
- None identified - this is a standalone UX improvement

### Success Metrics
- **Reduction in failed purchase attempts**: Expect 90%+ reduction in backend NSF errors from `PurchaseLoans.fs`
- **User satisfaction**: Faster feedback loop (immediate vs. after backend processing)
- **Support ticket reduction**: Fewer users contacting support about "purchase failed" errors
