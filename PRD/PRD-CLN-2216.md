# PRD: CLN-2216 - Use LoanAmount Instead of AdjustedLoanAmount for LTHFS Purchase Transfers

## Problem Statement

When purchasing LTHFS loans, the Selling platform currently uses `AdjustedLoanAmount` to calculate the principal amount debited from the investor's purchase account. This creates a discrepancy between Cross River Bank's accounting records and the Moment investor's records, who expect the purchase amount to be based on the original `LoanAmount` field instead.

This mismatch manifests in:
- **Reconciliation failures**: Purchase batch totals don't match investor's expected amounts
- **Reporting inconsistencies**: Pre-purchase totals, post-purchase notifications, and overdue loan summaries all show values that don't align with investor expectations
- **Manual reconciliation overhead**: Finance teams must manually reconcile the differences using spreadsheets (e.g., "Copy of 20250902 SG LS68.xlsx")

The root cause is that the loan purchasing logic (PurchaseAction.fs lines 189-195) uses `adjustedLoanAmount` for all loan types except HFS loans with `useNetFundingAsSource=true`. LTHFS loans for Moment investor should use `loanAmount` instead to match their accounting systems.

## Solution

The system will use `LoanAmount` instead of `AdjustedLoanAmount` when calculating the principal transfer amount for all LTHFS loans during purchase operations. This change will be applied consistently across all four locations where the principal amount is referenced:

1. **Principal transfer creation**: The actual money movement between investor and loan source accounts
2. **Pre-purchase total calculation**: The estimated total shown before batch purchase is triggered
3. **Post-purchase notification**: The BatchPurchaseCompleted event payload sent to stakeholders
4. **Overdue loan summary**: The principal amounts reported for loans past their purchase date

After this change, LTHFS loan purchase amounts will match investor accounting systems, eliminating reconciliation discrepancies. HFS and RET loan types will remain unchanged.

## User Stories

### Happy Path
1. As a **Finance Operations user**, I want LTHFS loan purchases to use the original loan amount, so that our purchase totals match the investor's expected amounts without manual reconciliation
2. As a **Purchase Processor**, I want the pre-purchase total to accurately reflect the actual transfer amount for LTHFS loans, so that I can validate batch amounts before approval
3. As an **Investor (Moment)**, I want to receive principal amounts based on LoanAmount for LTHFS purchases, so that my accounting system can automatically reconcile incoming transfers
4. As a **Finance Reporting user**, I want overdue LTHFS loan summaries to show principal based on LoanAmount, so that aging reports match investor expectations
5. As a **Webhook Consumer**, I want BatchPurchaseCompleted notifications to report LTHFS principal amounts using LoanAmount, so that downstream systems receive accurate totals
6. As a **System Administrator**, I want HFS loan purchase behavior to remain unchanged, so that existing HFS workflows continue to work correctly
7. As an **Operations Manager**, I want the change to apply to all LTHFS loans regardless of investor, so that we have consistent LTHFS purchase logic across the platform

### Edge Cases
8. As a **Purchase Processor**, I want the system to handle LTHFS loans where LoanAmount is null by treating it as 0m (existing behavior), so that purchases don't fail on malformed data
9. As a **Purchase Processor**, I want the system to handle LTHFS loans where LoanAmount is zero by skipping principal transfer creation, so that no-principal purchases are handled gracefully
10. As a **Purchase Processor**, I want the system to handle negative LoanAmount the same way it handles negative AdjustedLoanAmount (using BorrowerOverPaymentAccount), so that overpayment scenarios work correctly
11. As a **Finance Operations user**, I want the pre-purchase total to return 0m when LTHFS loans have null LoanAmount values, so that batch summaries remain accurate
12. As a **Batch Completion Processor**, I want post-purchase notifications to sum LoanAmount correctly for mixed batches with some null values, so that totals are accurate even with data quality issues
13. As an **Overdue Reporting user**, I want overdue loan summaries to aggregate LoanAmount correctly when some loans have null values, so that aging reports remain reliable

### Data Migration & Consistency
14. As a **System Administrator**, I want to verify that all LTHFS loans have LoanAmount values populated during data ingestion, so that the new logic works correctly from day one
15. As a **Data Engineer**, I want the LoanMapper to continue defaulting null LoanAmount to 0m (line 405), so that existing data quality safeguards remain in place
16. As a **Database Administrator**, I want to confirm that the LoanAmount column has the same nullability and precision as AdjustedLoanAmount, so that no database schema changes are required

### Testing & Validation
17. As a **QA Engineer**, I want the existing LTHFS purchase integration test to be updated to expect LoanAmount in transfers, so that automated tests validate the new behavior
18. As a **QA Engineer**, I want to create test scenarios for LTHFS loans with null, zero, and negative LoanAmount values, so that all edge cases are covered
19. As a **QA Engineer**, I want to validate that HFS loans with useNetFundingAsSource=false still use AdjustedLoanAmount, so that HFS purchase logic remains unchanged
20. As a **QA Engineer**, I want to validate that HFS loans with useNetFundingAsSource=true still use LoanAmountFunded, so that net funding logic remains unchanged

### Error Scenarios
21. As a **Purchase Processor**, I want the system to log a warning when LTHFS LoanAmount differs significantly from AdjustedLoanAmount, so that potential data quality issues are surfaced
22. As a **System Administrator**, I want the purchase to proceed even when LoanAmount is null (defaulting to 0m), so that single data quality issues don't block entire batches
23. As an **Operations Manager**, I want to receive notifications when LTHFS purchases complete with zero principal amounts, so that I can investigate potential data issues

### Reporting & Reconciliation
24. As a **Finance Analyst**, I want to query historical purchase totals and compare LoanAmount vs AdjustedLoanAmount for LTHFS loans, so that I can reconcile past discrepancies
25. As an **Auditor**, I want to verify that all LTHFS purchase transfers created after the change use LoanAmount, so that audit trails are clear
26. As a **Finance Operations user**, I want to generate a report of LTHFS loans where LoanAmount ≠ AdjustedLoanAmount, so that I understand the magnitude of historical discrepancies

## Implementation Decisions

### Core Business Logic Changes

**COS.Lending.Selling.WebApi Repository - Business Module**
- Modify the F# purchase action creator in PurchaseAction.fs `createPrincipal` function (currently lines 189-195)
- Change the conditional logic to check loan type first:
  ```
  If loanType = LTHFS: use loanAmount
  Elif useNetFundingAsSource AND loanType = HFS: use loanAmountFunded  
  Else: use adjustedLoanAmount
  ```
- This preserves existing HFS net funding behavior while fixing LTHFS behavior
- The function already handles null values via mapper defaults (0m), negative values via BorrowerOverPaymentAccount logic, and zero values by skipping transfer creation

**COS.Lending.Selling.WebApi Repository - Repository Layer**
- Update PurchaseLoanRepository.cs `GetPurchaseTotalAmount` method (line 691)
- Replace the `AdjustedLoanAmount ?? 0m` expression with conditional logic that selects `LoanAmount` for LTHFS loans and `AdjustedLoanAmount` for others
- Use LINQ conditional expression within the SumAsync to maintain single-query efficiency

**COS.Lending.Selling.WebApi Repository - Notification Layer**  
- Update PurchaseLoanRepository.cs `SendBatchPurchaseCompletedNotification` method (line 825)
- Modify the LINQ aggregate query that calculates `TotalPrincipalCharged` to conditionally sum `LoanAmount` for LTHFS loans and `AdjustedLoanAmount` for others
- The query already handles null values via the `?? 0` pattern, which will continue to work

**COS.Lending.Selling.WebApi Repository - Overdue Reporting**
- Update PurchaseLoanRepository.cs `FindOverdueLoans` method (line 899)
- Modify the GroupBy aggregation sum expression to conditionally use `LoanAmount` for LTHFS loans and `AdjustedLoanAmount` for others
- Ensure the ternary operator is translated correctly to SQL by EF Core

### Data Layer Considerations

**No Schema Changes Required**
- The `LoanAmount` column already exists in the `app.loan` table with nullable decimal type
- The column has the same precision and scale as `AdjustedLoanAmount`
- Both fields are populated during loan ingestion from source systems (Arix)

**Mapper Consistency**
- The LoanMapper.fs (line 405) already defaults `LoanAmount` to 0m when null: `loanAmount = data.LoanAmount |> Option.ofNullable <?> 0m`
- This mapping is used in the `loanForPurchaseToModel` function that converts database aggregates to domain models
- The mapper also handles `adjustedLoanAmount` the same way (line 406), ensuring consistent null handling
- No mapper changes are required

**Aggregate Object Updates**
- The LoansForPurchaseAggregate C# class already exposes both `LoanAmount` and `AdjustedLoanAmount` as nullable decimals
- The LINQ query in `GetLoansForPurchaseByBatchId` already selects both fields (lines 120-121)
- No changes to the aggregate class or query projection are required

### Backwards Compatibility

**Historical Data**
- Past LTHFS purchase transfers will continue to reference the principal amounts that were created with `AdjustedLoanAmount`
- The change only affects new purchases created after deployment
- Historical reconciliation will still require manual analysis comparing the two fields

**Contract Configuration**
- No changes to Contract entity or configuration tables are required
- The change applies uniformly to all LTHFS loans regardless of MPL, investor, or contract terms
- HFS contracts with `UseNetFundingAsSource` flag are unaffected

**Outbox Pattern**
- Transfer creation continues to use the existing TransferOutbox pattern for reliable async processing
- Notification events continue to use the existing NotificationOutbox pattern
- No changes to outbox processors or message handlers are required

### Interface Contracts

**Domain Models (F# Contracts)**
- The `LoanForPurchase` F# record type (PurchaseAction.fs lines 26-50) already includes all three amount fields:
  - `loanAmount: decimal` (line 30)
  - `adjustedLoanAmount: decimal` (line 31)  
  - `loanAmountFunded: decimal` (line 32)
- No changes to domain model types are required

**REST API Contracts**
- No changes to external API request/response contracts
- The pre-purchase total endpoint will return updated values for LTHFS loans, but the response schema remains the same
- Webhook consumers receive the same BatchPurchaseCompleted event structure with updated principal totals

**Database View Contracts**
- If any dbt models in cos-lending-selling-datatools reference purchase principal amounts, they should be updated to conditionally select `loan_amount` for LTHFS loans
- Reporting views that join transfers to loans for principal analysis may need updates to handle the new logic
- Downstream BI dashboards may need filters or conditional logic to handle the change date

## Testing Decisions

### Unit Test Updates

**PurchaseAction.fs Unit Tests**
- Locate existing LTHFS purchase tests in CRB.Cos.Lending.Selling.BusinessLogic.Tests
- Update test assertions to expect `loanAmount` value in principal transfers instead of `adjustedLoanAmount`
- Add new test cases covering:
  - LTHFS loan with null `loanAmount` (should default to 0m and skip transfer)
  - LTHFS loan with zero `loanAmount` (should skip transfer creation)
  - LTHFS loan with negative `loanAmount` (should create PurchaseNegativePrincipal transfer)
  - LTHFS loan where `loanAmount` ≠ `adjustedLoanAmount` (should use `loanAmount`)
  - HFS loan to verify no regression (should still use `adjustedLoanAmount` or `loanAmountFunded`)

**PurchaseLoanRepository Unit Tests**
- Update or create tests for `GetPurchaseTotalAmount` covering:
  - Batch with only LTHFS loans (should sum `loanAmount`)
  - Batch with only HFS loans (should sum `adjustedLoanAmount`)
  - Mixed batch (should sum appropriate field per loan type)
  - Loans with null amounts (should treat as 0m)
- Update tests for `SendBatchPurchaseCompletedNotification` with similar coverage
- Update tests for `FindOverdueLoans` to validate LTHFS loans use `loanAmount`

### Integration Test Updates

**End-to-End Purchase Flow Tests**
- Locate LTHFS purchase integration tests in cos-lending-selling-e2e-tests repository
- Update test data setup to specify distinct values for `loanAmount` and `adjustedLoanAmount`
- Update assertions to verify:
  - Transfer amount matches `loanAmount` not `adjustedLoanAmount`
  - Pre-purchase total calculation uses `loanAmount`
  - BatchPurchaseCompleted notification includes correct principal total
  - Database transfer records reference the correct amount
- Add test scenario for matured LTHFS loan purchase (should still use `loanAmount` for principal, not adjusted)

**Regression Test Suite**
- Execute full HFS purchase flow to validate no regression
- Execute full RET purchase flow if supported  
- Execute LTHFS purchase with various edge cases (null, zero, negative amounts)
- Execute batch completion flow with mixed loan types

### Test Data Strategy

**What Makes a Good Test**
- Test data should include LTHFS loans with `loanAmount` ≠ `adjustedLoanAmount` to validate the change
- Test data should include null/zero/negative scenarios for both fields
- Test data should include mixed batches to validate conditional logic
- Assertions should explicitly verify the field used, not just the presence of a transfer
- Tests should validate both immediate effects (transfer amount) and downstream effects (notifications, totals)

**Prior Art for Tests**
- Existing purchase integration tests in cos-lending-selling-e2e-tests follow a pattern:
  1. Setup: Create loan data, configure accounts, set contract rules
  2. Act: Trigger batch purchase via API call
  3. Assert: Verify transfers created, loan status updated, notifications sent
- Follow the same pattern but enhance assertions to be field-specific
- Existing unit tests for PurchaseAction use F# property-based testing with FsCheck - extend coverage with new edge cases
- Repository tests use in-memory EF Core context - reuse this pattern for new test cases

### Manual Testing Checklist

**Pre-Deployment Validation**
1. Verify data quality: Query LTHFS loans where `loan_amount IS NULL` to assess impact
2. Verify discrepancy magnitude: Query LTHFS loans where `loan_amount != adjusted_loan_amount` to quantify expected changes
3. Create test LTHFS loan in staging with known `loanAmount` value
4. Trigger manual purchase and verify transfer amount matches `loanAmount`
5. Verify pre-purchase total reflects `loanAmount`
6. Verify BatchPurchaseCompleted notification payload contains correct principal
7. Trigger overdue loan report and verify LTHFS amounts use `loanAmount`
8. Verify HFS purchase behavior unchanged by repeating steps 3-6 for HFS loan

**Post-Deployment Validation**  
1. Monitor first automated LTHFS purchase batch for correct amounts
2. Compare investor-provided reconciliation file to batch totals
3. Verify no discrepancies reported by investor
4. Monitor error logs for null `loanAmount` warnings (if implemented)
5. Compare pre-change vs post-change principal amounts for sample loans

## Out of Scope

**Data Backfilling**
- Historical LTHFS purchase transfers will NOT be updated or recalculated
- Past discrepancies between bank and investor records will NOT be automatically reconciled
- Finance teams must continue manual reconciliation for pre-deployment purchases

**Investor-Specific Logic**
- The change applies to ALL LTHFS loans, not just Moment investor
- No investor-specific conditional logic will be added
- No contract-level configuration flag for "use loanAmount vs adjustedLoanAmount"

**Other Loan Types**
- HFS loan purchase logic will NOT change (continues to use `loanAmountFunded` or `adjustedLoanAmount`)
- RET loan purchase logic will NOT change (continues to use `adjustedLoanAmount`)
- No changes to matured loan purchase logic beyond using `loanAmount` for LTHFS

**Source Data Changes**
- No changes to loan ingestion from Arix or other source systems
- No changes to servicing CSV import logic that populates `adjustedLoanAmount`
- No enforcement that `loanAmount` must be non-null for LTHFS loans

**Related Financial Operations**
- Interest accrual calculations are unchanged (use configured rates and methods)
- Volume fee calculations are unchanged (continue to use contract-defined methods)
- Fee collection logic is unchanged
- Grooming operations (investor/type changes) are unchanged

**Reporting & Analytics**
- No changes to dbt models in cos-lending-selling-datatools (though updates may be needed separately)
- No changes to BI dashboard queries or visualizations
- No new reports to analyze loanAmount vs adjustedLoanAmount discrepancies
- No historical discrepancy analysis tools

**UI Changes**
- No changes to loan display in COS.Lending.Selling.UI
- No visual indicators showing which field is used for purchase
- No admin controls to override field selection per loan

## Further Notes

### Risk Assessment

**Medium Risk: Data Quality**
- If LTHFS loans have systematically null `loanAmount` values, purchases could fail or create zero-amount transfers
- Mitigation: Pre-deployment data quality check (query nulls, assess population rate)
- Mitigation: Mapper already defaults null to 0m, preventing hard failures
- Mitigation: Monitor error logs post-deployment for unexpected zero-amount purchases

**Low Risk: Calculation Logic**
- The change is straightforward: swap one field for another in conditional logic
- Both fields have identical data types (nullable decimal) reducing type mismatch risk
- Existing null handling and edge case logic (negative amounts, overpayments) will continue to work

**Low Risk: HFS Regression**
- Changes are LTHFS-specific with explicit loan type checking
- HFS logic is preserved in else branches
- Integration tests will validate HFS behavior unchanged

**Low Risk: Investor Reconciliation**
- The change aligns with investor expectations, reducing discrepancies
- Any errors would manifest as different discrepancies, not loss of data
- Investors can compare post-change transfers to their expected amounts immediately

### Dependencies

**No External System Changes Required**
- Investor systems (Moment) require no updates - they already expect `loanAmount`
- Source systems (Arix) require no changes - they already provide both fields
- Downstream consumers (hooks subscribers) receive same event structure with different values

**Internal Coordination Required**
- Finance Operations team should be notified of deployment date for reconciliation timeline
- Data Engineering team should assess whether dbt models need updates for analytics consistency
- QA team must validate all test scenarios before production deployment

### Deployment Strategy

**Incremental Rollout Not Required**
- The change is deterministic (LTHFS = use loanAmount) with no configuration needed
- No feature flag required since the change aligns with investor expectations
- Can be deployed atomically as part of normal WebApi deployment

**Communication Plan**
- Notify Finance Operations team 3 days before deployment with expected behavior changes
- Notify Moment investor of improvement and expected reconciliation accuracy post-deployment
- Document change in internal knowledge base with before/after calculation logic

**Rollback Plan**
- If post-deployment discrepancies increase (indicating an error in implementation), rollback WebApi to previous version
- Coordinate with Finance team to determine if rollback is necessary based on first purchase batch results
- If partial rollback needed (only some LTHFS loans affected), investigate data quality issues with `loanAmount` field

### Performance Considerations

**Negligible Performance Impact**
- Conditional field selection adds minimal CPU overhead (simple if-then-else)
- LINQ queries continue to generate similar SQL execution plans
- No additional database queries or joins required
- No change to indexing strategy needed

### Monitoring & Observability

**Recommended Logging Enhancements**
- Log LTHFS loan ID, `loanAmount`, and `adjustedLoanAmount` values when creating principal transfers
- Log summary statistics in batch completion: "LTHFS loans: X, total principal: $Y using loanAmount"
- Log warning if LTHFS `loanAmount` is null (indicating data quality issue)
- Existing transfer creation logging and outbox processing logs will continue to capture transfer execution status

**Metrics to Monitor Post-Deployment**
- Count of LTHFS purchases where `loanAmount` = 0 (may indicate data quality issues)
- Discrepancy reports from Moment investor (should decrease after change)
- Average difference between `loanAmount` and `adjustedLoanAmount` for LTHFS loans (quantify impact magnitude)
- Batch purchase completion times (should remain unchanged)

### Historical Context

**Why AdjustedLoanAmount Exists**
- The `adjustedLoanAmount` field captures the principal balance after servicing adjustments (paydowns, payoffs, etc.)
- For many loan types and investors, the adjusted amount is the correct value to transfer (reflects current balance)
- The LTHFS/Moment scenario is unique: investor expects original loan amount, not serviced balance

**Why This Wasn't Caught Earlier**
- The difference may have been small initially (minimal servicing activity on newly originated loans)
- Manual reconciliation spreadsheets may have hidden the systematic discrepancy
- The ticket was raised after accumulating enough volume to make discrepancies material

### Success Criteria

**Quantitative Metrics**
- Zero reconciliation discrepancies reported by Moment investor for LTHFS purchases after deployment
- 100% of LTHFS purchase transfers use `loanAmount` field (validated via database query)
- No increase in purchase batch failures or partial purchases after deployment
- HFS purchase behavior unchanged (validated via integration tests and production monitoring)

**Qualitative Indicators**
- Finance Operations team reports reduced manual reconciliation effort for LTHFS loans
- Investor relationship managers report improved satisfaction from Moment investor
- No escalations or bug reports related to LTHFS purchase amounts after deployment
