I'll generate a comprehensive PRD for CLN-2216 based on the interview transcript and codebase knowledge.

## PRD: CLN-2216 - Fix Purchase Amount Calculation for Momnt LTHFS Loans

### Problem Statement

When Cross River Bank purchases Momnt LTHFS (Long-Term Held-For-Sale) loans, the system currently uses the servicing-adjusted loan balance (`adjustedLoanAmount`) as the purchase principal transfer amount. However, Momnt's accounting system expects the original loan amount at origination (`loanAmount`) to be transferred during purchase. This discrepancy creates reconciliation issues between Cross River Bank's records and Momnt's financial records, requiring manual intervention to resolve the differences in money and loan counts.

The root cause is in the purchase principal calculation logic within the `PurchaseAction` domain module, which applies a blanket rule to all LTHFS loans regardless of MPL-specific requirements. This one-size-fits-all approach doesn't account for variations in how different MPLs (Marketplace Lenders) track and expect loan purchase amounts.

### Solution

The system will use MPL-specific logic when calculating purchase principal transfer amounts for LTHFS loans. For Momnt (MPL ID: "MMT") LTHFS loans specifically, the purchase transfer will use the original loan amount from origination rather than the servicing-adjusted balance. This change is surgical and targeted—it only affects the initial purchase principal transfer for Momnt LTHFS loans, while all other operations (interest calculations, pass-through interest, invoicing, receipts, and purchases for other MPLs) continue to function exactly as they do today.

From the user's perspective, Momnt LTHFS loan purchases will now match their accounting records exactly, eliminating reconciliation discrepancies and reducing manual investigation time.

### User Stories

1. As a **Finance Operations team member**, I want Momnt LTHFS loan purchases to use the original loan amount, so that our purchase transfer amounts match Momnt's accounting records without manual reconciliation.

2. As a **Finance Operations team member**, I want all non-Momnt LTHFS loans to continue using adjusted loan amounts for purchases, so that existing MPL relationships and their reconciliation processes are not disrupted.

3. As a **Treasury Operations team member**, I want the purchase transfer amount to reflect the contractually agreed-upon principal, so that we can accurately track funds movement and maintain proper audit trails.

4. As an **Accounting team member**, I want interest calculations to continue using the servicing-adjusted loan balance regardless of MPL, so that interest accrues on the actual outstanding loan balance.

5. As a **Reporting team member**, I want the Transfer entity records to accurately reflect the purchase principal amount used, so that financial reports and reconciliation reports show correct transaction amounts.

6. As an **MPL relationship manager**, I want MPL-specific purchase calculation logic to be maintainable, so that future MPL onboarding can accommodate similar variations in accounting requirements.

7. As a **QA engineer**, I want to verify that a Momnt LTHFS loan with `loanAmount` = $10,000 and `adjustedLoanAmount` = $9,500 creates a purchase transfer for exactly $10,000.

8. As a **QA engineer**, I want to verify that a non-Momnt LTHFS loan (e.g., Marlette) with `loanAmount` = $10,000 and `adjustedLoanAmount` = $9,500 still creates a purchase transfer for $9,500.

9. As a **QA engineer**, I want to verify that HFS loans with `useNetFundingAsSource=true` continue using `loanAmountFunded` regardless of MPL.

10. As a **Finance Operations team member**, I want the Batch summary totals to reflect the sum of actual transfer amounts (using correct per-MPL logic), so that batch-level reporting is accurate.

11. As a **Developer**, I want the purchase amount logic to be clear and well-documented, so that future MPL-specific variations can be added without introducing bugs.

12. As an **Auditor**, I want the LoanAction audit log to capture which amount was used for purchase, so that we can trace back purchase decisions for compliance purposes.

13. As a **Data Engineer**, I want downstream reporting and analytics to automatically reflect the correct purchase amounts, so that dbt models and BI reports don't require special case handling.

14. As a **Finance Operations team member**, I want invoices and receipts generated for Momnt LTHFS purchases to show the original loan amount, so that documentation matches the actual transfer amounts.

15. As a **QA engineer**, I want to verify that the change does not affect pass-through interest calculations, which should continue using `adjustedLoanAmount` for all MPLs and loan types.

16. As a **System Administrator**, I want to verify that the outbox pattern for transfer operations continues to work reliably after this change, so that purchase transfers are guaranteed to reach the accounting system.

17. As a **Finance Operations team member**, I want to see no change in purchase behavior for edge cases like loans with missing or zero adjusted amounts, so that error handling remains consistent.

18. As a **Performance Engineer**, I want the additional MPL check to have negligible performance impact on batch purchase operations, so that throughput remains consistent.

19. As a **Developer**, I want to understand how this change interacts with loan grooming operations (investor changes, loan type changes), so that grooming logic doesn't need adjustment.

20. As an **Integration Engineer**, I want to verify that the hooks/notifications published after purchase reflect the correct transfer amount, so that downstream systems receive accurate event data.

### Implementation Decisions

**Repository and Module:**
- Modify the `COS.Lending.Selling.WebApi` repository, specifically the F# business logic in the `PurchaseAction` domain module.
- The change is isolated to the `createPrincipal` function which calculates purchase principal transfer amounts.

**Logic Changes:**
- Add MPL-specific conditional logic to the purchase amount calculation.
- Check for the combination of `loanType = LTHFS` AND `mplId = "MMT"` to determine when to use `loanAmount`.
- Maintain existing logic for all other cases: HFS with `useNetFundingAsSource` uses `loanAmountFunded`, all other scenarios use `adjustedLoanAmount`.
- The conditional logic should be ordered: (1) HFS special case, (2) Momnt LTHFS case, (3) default case.

**Entities Affected:**
- **Loan**: The entity being purchased, specifically its `loanAmount`, `adjustedLoanAmount`, `mplId`, and `loanType` fields are consulted.
- **Transfer**: The entity created as a result of purchase, will now contain the correct principal amount based on MPL-specific rules.
- **Batch**: Summary totals will reflect the sum of correctly calculated transfer amounts.
- **LoanAction**: Audit trail should reflect that a purchase occurred and the amount transferred.

**No Database Schema Changes:**
- All necessary fields already exist in the Loan entity (`loanAmount`, `adjustedLoanAmount`, `loanAmountFunded`, `mplId`, `loanType`).
- No new columns, tables, or indices are required.

**No API Contract Changes:**
- The purchase APIs in `COS.Lending.Selling.WebApi` maintain the same request/response contracts.
- The change is internal to business logic and transparent to API consumers.

**Outbox Pattern:**
- The existing `TransferOutbox` implementation will automatically handle the new transfer amounts.
- No changes required to outbox processors or event publishing logic.

**No Impact on Related Operations:**
- Interest calculations (daily interest accrual, pass-through interest) continue using `adjustedLoanAmount` for all loans.
- Invoice and receipt generation already use `loanAmount` field, so they naturally align with the new purchase behavior for Momnt LTHFS.
- Fee calculations are not affected by this change.
- Loan grooming operations are not affected as they don't directly depend on purchase amount calculation logic.

**Configuration vs. Code:**
- This change is implemented in code with a hardcoded MPL ID check (`"MMT"`).
- Future enhancement could move this to contract configuration if multiple MPLs require similar treatment, but for now the hardcoded approach is simpler and sufficient.

**Architectural Considerations:**
- Maintains the functional programming style of the existing F# codebase.
- Preserves the immutability and type safety of the domain model.
- Does not introduce side effects or stateful behavior.

**Integration Points:**
- The change is transparent to the `COS.Lending.Selling.Hooks` service, which will receive transfer events with correct amounts.
- The `cos-lending-selling-datatools` dbt models will automatically reflect correct transfer amounts with no changes required.
- The `cos-lending-selling-ai` service will query Transfer records with correct amounts for natural language reporting.

### Testing Decisions

**Unit Testing:**
- Test the modified `createPrincipal` function in `PurchaseAction` with parameterized test cases covering:
  - Momnt LTHFS loan with different `loanAmount` vs `adjustedLoanAmount` → asserts `loanAmount` is returned
  - Non-Momnt LTHFS loan (e.g., Marlette, mpl_id="MAR") → asserts `adjustedLoanAmount` is returned
  - HFS loan with `useNetFundingAsSource=true` → asserts `loanAmountFunded` is returned
  - HFS loan with `useNetFundingAsSource=false` → asserts `adjustedLoanAmount` is returned
  - Edge cases: loans with zero amounts, null MPL IDs, missing data
- Follow existing F# testing patterns using xUnit and FsUnit in the WebApi test project.
- Good tests should use realistic loan data scenarios and verify the exact amount returned, not just that the function runs.

**Integration Testing:**
- Test the full purchase workflow using the existing `cos-lending-selling-e2e-tests` infrastructure:
  - Create a Momnt LTHFS loan with known `loanAmount` and `adjustedLoanAmount` values
  - Execute purchase operation (single loan and batch purchases)
  - Verify the Transfer entity in the database contains `loanAmount` as the principal
  - Verify the Batch total reflects the sum of `loanAmount` values for all Momnt LTHFS loans in the batch
  - Verify LoanAction audit log records the purchase
  - Verify outbox processing completes and transfer events are published
- Test mixed batch scenarios containing both Momnt LTHFS and other loan types to ensure correct per-loan logic.
- Good integration tests should use the COS simulator and mock accounting system to verify end-to-end money movement.

**Regression Testing:**
- Verify that existing automated tests for non-Momnt loan purchases continue to pass without modification.
- Run the full e2e test suite to ensure no unintended side effects on:
  - Interest accrual calculations
  - Fee collection operations
  - Loan grooming workflows
  - Invoice and receipt generation
  - Volume fee processing
- Good regression tests should confirm that the change is truly isolated to Momnt LTHFS purchase amounts.

**Testing Modules:**
- `COS.Lending.Selling.WebApi.Tests`: Unit tests for `PurchaseAction` module
- `cos-lending-selling-e2e-tests`: Integration tests for full purchase workflow
- Existing test fixtures and factories should be extended to support creating Momnt-specific test loans.

**Prior Art:**
- The existing e2e tests demonstrate patterns for setting up loan data, executing purchases, and verifying transfers.
- The WebApi test suite contains examples of F# unit tests for business logic functions.
- Test data factories in e2e tests show how to create loans with specific MPL IDs and loan types.

**What Makes a Good Test:**
- Tests should be deterministic and use explicit, known test data values (e.g., loanAmount=$10,000, adjustedLoanAmount=$9,500).
- Tests should verify the specific amount used, not just that a transfer was created.
- Tests should cover the boundary between Momnt LTHFS and all other scenarios to prevent logic errors.
- Tests should validate that downstream entities (Batch totals, audit logs) reflect the correct amounts.

### Out of Scope

**Explicitly NOT part of this change:**

1. **Interest Calculation Changes**: Pass-through interest, daily interest accrual, and interest rate calculations continue using `adjustedLoanAmount` for all loans regardless of MPL.

2. **Other MPL Logic**: This change is specific to Momnt (MPL ID "MMT"). Other MPLs like Marlette, Upgrade, or Wisetack are not affected and continue using adjusted loan amounts.

3. **HFS Loan Logic**: HFS (Held-For-Sale) loan purchase logic remains unchanged. Loans with `useNetFundingAsSource=true` continue using `loanAmountFunded`.

4. **Configuration-Driven MPL Rules**: The MPL ID check is hardcoded. Creating a configuration table or contract-level setting for purchase amount logic is out of scope.

5. **Historical Data Remediation**: This change applies to future purchases only. Historical purchases that used `adjustedLoanAmount` for Momnt LTHFS loans will not be recalculated or corrected.

6. **Invoice and Receipt Logic Changes**: These already use `loanAmount` and require no modification, but formal verification of this existing behavior is out of scope.

7. **Fee Calculation Changes**: DMV fees, stamp taxes, volume fees, and other fee calculations are not affected by this change.

8. **Loan Grooming Logic**: Investor change and loan type change operations do not depend on purchase amount logic and are out of scope.

9. **Reporting and Analytics Changes**: dbt models, BI dashboards, and the AI service will automatically reflect correct transfer amounts with no explicit changes required. Creating new reports specifically to highlight this change is out of scope.

10. **API Contract Modifications**: No new endpoints, request parameters, or response fields are being added. The change is internal to business logic.

11. **Database Schema Changes**: No new tables, columns, indices, or constraints are required.

12. **Performance Optimization**: The additional MPL ID check has negligible performance impact and does not require optimization or caching strategies.

13. **Audit Trail Enhancements**: The existing LoanAction audit log is sufficient. Adding explicit tracking of which amount logic was used is out of scope.

14. **Multi-MPL Scenarios**: Handling hypothetical scenarios where a loan could belong to multiple MPLs or change MPLs during its lifecycle is out of scope.

15. **Servicing Data Import Changes**: The `cos-lending-selling-ingestion` service continues importing servicing CSV files and updating `adjustedLoanAmount` as before.

### Further Notes

**Risks and Mitigations:**
- **Risk**: Incorrect MPL ID check (typo, wrong ID) could cause Momnt loans to continue using wrong amount.
  - **Mitigation**: Integration tests with real Momnt MPL ID, code review to verify hardcoded ID matches production data.
  
- **Risk**: Mixed batches containing Momnt and non-Momnt LTHFS loans could have incorrect batch totals.
  - **Mitigation**: Integration test specifically for mixed batch scenarios, verify batch summary calculation logic.

- **Risk**: Downstream systems consuming transfer events might not expect amount variations by MPL.
  - **Mitigation**: Transfer entity schema and events are unchanged—only the amount value differs. Consumers should already handle varying amounts.

**Dependencies:**
- No external system dependencies. The change is self-contained within the WebApi business logic.
- No coordination required with other teams or services.
- No database migration or deployment ordering requirements.

**Rollout Strategy:**
- This change can be deployed independently via standard WebApi deployment process.
- No feature flag required as the change is low-risk and deterministic based on loan data.
- Rollback is straightforward: revert the code change and redeploy.

**Monitoring and Validation:**
- After deployment, query the Transfer table for recent Momnt LTHFS purchases and verify amounts match `loanAmount` field.
- Monitor batch purchase operations for Momnt loans to ensure no errors or unexpected behavior.
- Coordinate with Finance Operations to confirm Momnt reconciliation discrepancies are resolved.

**Technical Context:**
- The `PurchaseAction.fs` file is part of the F# domain model in COS.Lending.Selling.WebApi.
- The function being modified (`createPrincipal`) is pure and deterministic, making it low-risk to change.
- F# pattern matching ensures the conditional logic is type-safe and exhaustive.

**Business Context:**
- Momnt is a key MPL partner, and reconciliation issues create operational overhead.
- This fix aligns the system behavior with Momnt's contractual expectations and accounting standards.
- Other MPLs may have similar requirements in the future, making this change a potential template for MPL-specific logic.

**Future Considerations:**
- If additional MPLs require custom purchase amount logic, consider refactoring to a strategy pattern or contract-level configuration.
- The hardcoded MPL ID approach is acceptable for a single MPL but doesn't scale to many MPLs with different rules.
- Consider adding a purchase amount calculation audit field to LoanAction if multiple MPL-specific rules emerge.