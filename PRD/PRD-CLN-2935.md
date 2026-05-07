# PRD: CLN-2935 - Add "mpl_id" to Error Logs for Insufficient Funds Batches

## Problem Statement

When loan purchase batches fail due to insufficient funds in MPL accounts, the error logs lack critical context for troubleshooting and debugging. Currently, error logs include account numbers and required/available balances, but omit the `mpl_id` field that identifies which Marketplace Lender the batch belongs to.

This creates operational friction:
- **Support engineers** cannot quickly filter error logs by MPL when investigating issues across multiple marketplace lenders
- **MPL operations teams** cannot easily identify their own insufficient funds errors in aggregated logs
- **DevOps teams** need to perform additional database queries to correlate batch IDs with MPLs when debugging production issues
- **Audit and compliance teams** have incomplete transaction context for regulatory reporting

The `Batch` entity already stores `MplId` (populated during batch creation from `PurchaseLoansRequest.mplId`), but this information is not included in the two critical error locations where insufficient funds are logged.

## Solution

Enhance error logging to include `mpl_id` as a structured logging property in both locations where insufficient funds errors are recorded:

1. **Account-level logs** (PurchaseLoans.fs, line 89) - When individual accounts are identified as having insufficient funds during balance validation
2. **Batch-level logs** (DataProvider.fs, line 964) - When the batch fails and status is updated to `BatchFailed` with insufficient funds reason

Users will see logs formatted as:
```
MPL {MplId}: Account {accountNum} has insufficient funds. Required balance: {required}, Available balance: {available}
```

And:
```
MPL {MplId}: Failed to start loan purchase for BatchId={BatchId}: Reason: {Reason}
```

The `mpl_id` will be positioned as the first structured property for easy log filtering and grep operations.

## User Stories

1. As a **support engineer**, I want to see the MPL ID in insufficient funds error logs, so that I can immediately identify which marketplace lender is affected without querying the database
2. As a **support engineer**, I want to filter logs by MPL ID using structured logging queries, so that I can isolate errors for a specific marketplace lender across multiple batches
3. As an **MPL operations team member**, I want my MPL's insufficient funds errors to be clearly labeled, so that I can identify and resolve account funding issues quickly
4. As a **DevOps engineer**, I want batch failure logs to include MPL context, so that I can set up MPL-specific alerting rules in CloudWatch or similar monitoring systems
5. As a **developer debugging production issues**, I want the error message to show MPL ID first, so that I can grep logs by MPL pattern without additional lookups
6. As an **audit team member**, I want complete transaction context in error logs, so that I can provide accurate regulatory reports showing which MPLs experienced operational issues
7. As a **system monitoring alert**, I want MPL ID in structured log properties, so that alert rules can route notifications to the correct MPL contact
8. As a **data analyst**, I want consistent MPL identification across all error types, so that I can build accurate dashboards showing error rates by marketplace lender
9. As a **QA engineer**, I want to verify that both account-level and batch-level logs include MPL ID, so that I can confirm complete error context in all scenarios
10. As a **product manager**, I want error logs to be self-contained, so that support teams don't waste time correlating data across multiple systems
11. As a **developer**, I want the mpl_id extraction logic to be simple and maintainable, so that future changes to the batch or loan structure don't break logging
12. As a **developer**, I want defensive coding for edge cases, so that if MPL ID is somehow missing, logs still output with "UNKNOWN" rather than failing
13. As a **batch processing system**, I want to log MPL context at the earliest point of failure, so that downstream error handling has complete information
14. As a **regulatory compliance system**, I want immutable log records with MPL attribution, so that audit trails meet financial industry standards
15. As an **operations dashboard**, I want to parse MPL ID from log structured properties, so that I can display real-time error metrics grouped by marketplace lender

## Implementation Decisions

### Repositories and Modules
- **COS.Lending.Selling.WebApi** - Business logic and data access layer modifications
  - `CRB.Cos.Lending.Selling.BusinessLogic.PurchaseLoans` module - Add mpl_id parameter to account validation logic
  - `CRB.Cos.Lending.Selling.Data.DataProvider` module - Query batch entity to extract mpl_id for batch failure logs

### Function Signature Changes

**PurchaseLoans.fs:**
1. `getInsufficientFundsAccounts` - Add `mplId: string` parameter
2. `checkAccounts` - Add `mplId: string` parameter  
3. `createTransfers` - Extract `mplId` from loaded loans list using pattern: `loans |> List.tryHead |> Option.map (_.mplId) |> Option.defaultValue "UNKNOWN"`

**DataProvider.fs:**
1. `updateBatch` - Query batch entity to get MplId before logging: `repository.GetBatchDetails(batchId)` returns `Batch` object with `MplId` property
2. Use pattern: `batch.MplId |> Option.ofObj |> Option.defaultValue "UNKNOWN"`

### Structured Logging Format
- Use Microsoft.Extensions.Logging structured logging with named parameters
- Position `{MplId}` as the first property in all insufficient funds log messages
- Account-level log: `logger.LogError("MPL {MplId}: Account {accountNum} has insufficient funds. Required balance: {required}, Available balance: {available}", mplId, accountNum, amm, balance)`
- Batch-level log: `logger.LogError("MPL {MplId}: Failed to start loan purchase for BatchId={BatchId}: Reason: {Reason}", mplId, batchId, reason)`

### Data Flow
1. **createTransfers function** - Loads loans for batch, extracts mpl_id from first loan (all loans in batch share same MPL)
2. **checkAccounts function** - Receives mpl_id and passes to getInsufficientFundsAccounts
3. **getInsufficientFundsAccounts function** - Uses provided mpl_id in account-level error logs
4. **updateBatch function** - Queries batch entity, extracts MplId, uses in batch failure log

### Edge Case Handling
- **Empty loan list**: Default to "UNKNOWN" mpl_id using `Option.defaultValue "UNKNOWN"`
- **Null MplId in Batch**: Default to "UNKNOWN" using `Option.ofObj |> Option.defaultValue "UNKNOWN"`
- **Loan list with no tryHead**: F# pattern matching handles gracefully with Option.defaultValue
- **Multiple MPLs in same batch**: Not architecturally possible - batches are MPL-scoped (enforced in TriggerBatch)

### No Database Schema Changes
- `Batch.MplId` field already exists (nullable string, line 12 in Batch.cs)
- `LoanForPurchase.mplId` field already exists (populated in GetLoansForPurchaseByBatchId)
- No migrations required

### No API Contract Changes
- Internal logging enhancement only
- No changes to REST endpoints, request/response models, or external integrations
- No changes to hooks, notifications, or event publishing

## Testing Decisions

### Unit Tests
- **Module**: COS.Lending.Selling.Tests (existing test project)
- **Test new mpl_id parameter in PurchaseLoans module**:
  - Test `getInsufficientFundsAccounts` receives and logs mpl_id correctly
  - Test `checkAccounts` passes mpl_id through to validation
  - Verify structured logging includes `{MplId}` property in log output
  - Test "UNKNOWN" default when loan list is empty
  
- **Test mpl_id extraction in DataProvider module**:
  - Mock `GetBatchDetails` to return Batch with MplId
  - Mock `GetBatchDetails` to return Batch with null MplId (test "UNKNOWN" default)
  - Verify `updateBatch` logs include `{MplId}` property
  - Test batch not found scenario (defensive coding)

### Integration Tests
- **Module**: cos-lending-selling-e2e-tests
- **Test end-to-end insufficient funds scenario**:
  1. Create test batch with known mpl_id (e.g., "TESTMPL")
  2. Set up mock COS accounts with insufficient balance
  3. Trigger purchase batch
  4. Assert account-level error log contains "MPL {MplId}: Account {...} has insufficient funds" with correct mpl_id
  5. Assert batch-level error log contains "MPL {MplId}: Failed to start loan purchase..." with correct mpl_id
  6. Verify batch status updated to `BatchFailed`
  7. Verify batch reason field contains insufficient funds message

- **Test structured logging parsing**:
  - Capture log output during test execution
  - Parse structured properties (using JSON log format if available)
  - Assert `MplId` structured property exists and matches expected value
  - Test log filtering by mpl_id pattern

### Prior Art for Tests
- **Logging tests**: Follow patterns from existing repository test files (e.g., PurchaseLoanRepositoryTests.cs)
- **Business logic tests**: Follow F# test patterns in COS.Lending.Selling.Tests for PurchaseLoans module
- **E2E tests**: Follow existing batch purchase test scenarios in cos-lending-selling-e2e-tests (batch creation, purchase flow, error scenarios)
- **Mock patterns**: Use existing mock patterns for ILogger, IPurchaseLoanRepository, ILoanRepository

### What Makes a Good Test
1. **Tests the complete log message format** - Including positioning of MplId as first property
2. **Tests structured logging properties** - Not just string matching, but actual property values
3. **Tests both success and edge cases** - Including null/missing MPL ID scenarios
4. **Tests both log locations** - Account-level AND batch-level logs
5. **Uses realistic test data** - Real MPL IDs like "MARLETTE", "MOMNT" from seed data
6. **Verifies no regression** - Existing log information (account numbers, balances) still present
7. **Tests filtering behavior** - Simulates how support engineers would grep/filter logs by MPL

## Out of Scope

1. **Historical log backfilling** - Existing logs will not be retroactively updated with mpl_id
2. **Adding mpl_id to other error types** - Only insufficient funds errors are included in this change
3. **UI changes** - No changes to frontend error displays or batch detail screens
4. **Alerting rule configuration** - DevOps teams must configure MPL-specific alerts separately
5. **Database audit log tables** - Only application logs are enhanced, not audit/event tables
6. **Performance optimization** - Batch entity query in updateBatch is acceptable overhead (already queried elsewhere)
7. **Log aggregation service configuration** - CloudWatch, Splunk, or other log platforms must be configured by operations teams to parse new structured properties
8. **Adding mpl_id to success logs** - Only error logs are modified per ticket requirements
9. **Modifying loan-level purchase logs** - Only batch-level and account-level insufficient funds logs
10. **Cross-MPL batch support** - Not adding logic to handle multiple MPLs in one batch (architecturally impossible)
11. **Notification system updates** - Hooks service notifications are not modified
12. **API response changes** - Batch failure reasons in API responses remain unchanged
13. **Reporting dashboard updates** - BI dashboards must independently add MPL filtering if desired

## Further Notes

### Dependencies
- No external service dependencies
- No library upgrades required
- F# 7.0 option syntax already supported (`_.mplId` syntax for lambda shorthand)

### Risks
- **Low risk**: Changes are isolated to logging statements with defensive defaults
- **No breaking changes**: Function signatures add parameters at the end; callers updated within same module
- **Rollback strategy**: Simple code revert if issues arise; no database state changes

### Related Work
- **Interview transcript** indicates this was analyzed through detailed codebase exploration and stakeholder decision-making
- Analysis confirmed Batch entity has MplId field populated during TriggerBatch
- Analysis confirmed loans in a batch are grouped by MPL (line 53-55 in PurchaseLoanRepository.cs)

### Future Enhancements (Not in Scope)
- Add mpl_id to all loan purchase error logs (not just insufficient funds)
- Add structured logging to other modules (interest calculation, fee collection, grooming)
- Implement centralized logging context that automatically includes MPL for all batch operations
- Add mpl_id to LoanAction audit records for complete traceability

### Deployment Notes
- **Zero downtime deployment**: Logging changes don't affect business logic
- **No database migration**: Uses existing Batch.MplId field
- **No configuration changes**: Log format changes are code-only
- **Monitoring**: After deployment, verify CloudWatch logs show new structured MplId property

### Validation Criteria
1. Trigger batch purchase with insufficient funds
2. Verify error logs contain "MPL {MplId}:" prefix
3. Verify structured log properties include MplId field
4. Verify CloudWatch log insights can filter by `fields.MplId`
5. Verify both account-level and batch-level logs include MPL context
6. Verify edge case with missing MPL shows "UNKNOWN" rather than null/error
