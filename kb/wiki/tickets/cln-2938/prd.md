Perfect! I've generated a comprehensive PRD for **CLN-2938: Disable Confirm Purchase Button on NSF**.

## Key Highlights:

### Problem Statement
Users can currently confirm purchases even with insufficient funds (NSF), leading to backend errors and poor UX. The validation only happens after submission in `PurchaseLoans.fs`, creating unnecessary friction.

### Solution
Implement client-side NSF validation in `table-bottom.tsx` that:
- Disables "Confirm Purchase" button when NSF detected
- Shows clear error message with amounts
- Updates dynamically when account selection changes
- Handles loading/error states defensively

### User Stories (25 total)
Comprehensive coverage including:
- Happy paths (sufficient funds)
- NSF detection (single & multiple accounts)
- Dynamic validation when switching purchase accounts
- Loading and error states
- Edge cases (exact balance match, empty data)
- Error message styling and wording
- System reliability

### Implementation Decisions
- **Module**: `src/components/loans/main/table-bottom.tsx` in COS.Lending.Selling.UI
- **No Backend Changes**: Uses existing APIs, backend validation remains as safety net
- **Architecture**: Client-side only, reactive validation, no new API endpoints
- **Validation Logic**: 
  - Single account: `accountBalanceData < totalAmount`
  - Multiple accounts: `sum(balances) < totalAmount`
- **Error Message**: Red text with ⚠️ icon, hardcoded English (no i18n)

### Testing
- Unit tests for all validation scenarios
- Integration tests using cos-lending-selling-e2e-tests infrastructure
- Manual testing checklist for single/multi-account scenarios

The PRD is grounded in actual codebase references (repos, entities, APIs, patterns) and includes 12 explicit out-of-scope items plus future enhancement ideas.