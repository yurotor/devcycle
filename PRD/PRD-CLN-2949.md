# PRD: CLN-2949 - Pagaya Mapping: Additional Accounts

## Problem Statement

Pagaya, an existing investor in the COS Lending Selling platform, is expanding their loan purchase operations by introducing three new purchase accounts. Currently, the account resolution system in `cos-lending-selling-data-utils` does not have mapping rules configured for these new accounts, which means loans that should be routed to these accounts cannot be properly processed for purchase. 

Without these mappings, loans with the specific field values (Pagaya-2025-REV1, PT-Lumin-Trust, and PAID 26-218 in their Arix database fields) will fail account resolution, blocking the purchase workflow and preventing Pagaya from acquiring loans through these new accounts.

The account resolution process queries loan attributes from the Arix database (specifically `Larixdb..loansummary.field3` and `Farixdb..loansummary.field19.account_name`) and maps them to financial account numbers. These new mappings must be added to enable proper routing of purchase transactions to the correct accounts.

## Solution

The account resolution configuration in `cos-lending-selling-data-utils` will be updated to include three new custom purchase account mappings for Pagaya. These mappings will enable the system to automatically route loans to the appropriate purchase accounts based on specific field values present in the source Arix database.

When the account resolution utility runs (either as part of the Airflow orchestration via `cos-lending-selling-dags` or on-demand), it will evaluate loans against the new mapping rules and populate the `LoanAccount` entity with the correct account numbers and purchase objectives. This enables the WebApi purchase workflow to execute transfers to the proper financial accounts.

The configuration will be deployed through standard environments (DEV → QA → PROD), ensuring each environment can be validated independently before promoting to production.

## User Stories

1. As a data engineer, I want to update the account mapping configuration file in `cos-lending-selling-data-utils`, so that new Pagaya accounts are recognized by the system.

2. As the account resolution utility, I want to evaluate `Larixdb..loansummary.field3` for the value "Pagaya-2025-REV1", so that I can map matching loans to account number 2952696942 with purchase objective.

3. As the account resolution utility, I want to evaluate `Larixdb..loansummary.field3` for the value "PT-Lumin-Trust", so that I can map matching loans to account number 2869976205 with purchase objective.

4. As the account resolution utility, I want to evaluate `Farixdb..loansummary.field19.account_name` for the value "PAID 26-218", so that I can map matching loans to account number 3943697015 with purchase objective.

5. As the account resolution process, I want to match Pagaya investor name (not ID) when applying these mapping rules, so that loans are correctly associated with the Pagaya investor entity.

6. As the account resolution utility, I want these new mappings to be additive to existing Pagaya mappings, so that previously configured accounts continue to work without disruption.

7. As a loan in the system with field3="Pagaya-2025-REV1", I want my LoanAccount records to be populated with account number 2952696942 for purchase objective, so that purchase transfers can be executed to the correct account.

8. As a loan in the system with field3="PT-Lumin-Trust", I want my LoanAccount records to be populated with account number 2869976205 for purchase objective, so that purchase transfers can be executed to the correct account.

9. As a loan in the system with field19.account_name="PAID 26-218", I want my LoanAccount records to be populated with account number 3943697015 for purchase objective, so that purchase transfers can be executed to the correct account.

10. As the WebApi purchase workflow, I want to find the correct purchase account via LoanAccount relationships, so that I can create Transfer entities with the proper source and destination accounts.

11. As a QA engineer, I want to deploy the configuration changes to DEV environment first, so that I can validate the mappings work correctly before production deployment.

12. As a QA engineer, I want to verify that loans with the specified field values are mapped to the correct account numbers in the Selling database, so that I can confirm the configuration is working as expected.

13. As a QA engineer, I want to test that existing Pagaya account mappings still work after adding the new ones, so that I can ensure backward compatibility.

14. As a QA engineer, I want to verify that only loans matching the exact field values are mapped to the new accounts, so that I can confirm proper rule evaluation.

15. As a QA engineer, I want to test that loans with field3="Pagaya-2025-REV1" in DEV are mapped to account 2952696942, so that I can validate the first mapping rule.

16. As a QA engineer, I want to test that loans with field3="PT-Lumin-Trust" in DEV are mapped to account 2869976205, so that I can validate the second mapping rule.

17. As a QA engineer, I want to test that loans with field19.account_name="PAID 26-218" in DEV are mapped to account 3943697015, so that I can validate the third mapping rule.

18. As a DevOps engineer, I want to deploy the updated configuration to QA after DEV validation, so that additional testing can be performed before production.

19. As a DevOps engineer, I want to deploy the configuration to PROD after QA sign-off, so that Pagaya can begin using the new purchase accounts.

20. As a data engineer, I want the configuration file to follow the same JSON structure as existing mappings, so that the account resolution utility can parse it correctly.

21. As an operations team member, I want to monitor that loans are successfully being mapped to the new accounts in production, so that I can confirm the deployment was successful.

22. As the Airflow DAG orchestrator in `cos-lending-selling-dags`, I want to trigger account resolution runs that include the new mapping rules, so that loan accounts are kept up to date.

23. As a loan that doesn't match any of the new field values, I want to continue being mapped according to existing rules, so that my account resolution is not affected by this change.

24. As the account resolution utility, I want to handle cases where field3 or field19 values are null or empty, so that I don't incorrectly apply the new mappings.

25. As the account resolution utility, I want to handle cases where field values partially match (e.g., "Pagaya-2025-REV10" vs "Pagaya-2025-REV1"), so that I only map exact matches.

26. As a developer reviewing the configuration, I want clear documentation of which field values map to which accounts, so that future changes can be made confidently.

27. As the system, I want to ensure the new account numbers are valid in the Account entity, so that transfers don't fail due to invalid destination accounts.

28. As a batch purchase operation in WebApi, I want to use the newly mapped purchase accounts when processing Pagaya loans, so that funds are transferred to the correct destinations.

29. As a reporting process in `cos-lending-selling-datatools`, I want to see accurate account mappings in the LoanAccount table for reporting purposes, so that account reconciliation is correct.

30. As an integration test in `cos-lending-selling-e2e-tests`, I want to validate end-to-end loan processing with the new account mappings, so that regression testing covers the new configuration.

## Implementation Decisions

**Repository and Module:**
- Primary repository: `cos-lending-selling-data-utils`
- Target file: JSON configuration file located in the repository root containing custom purchase account mapping rules
- The file structure will be examined to match existing mapping patterns for Pagaya and other investors

**Entity and Data Model Changes:**
- No schema changes required to `Cos.Lending.Selling.DbModel`
- No new tables or columns needed
- Existing entities that will be populated: `LoanAccount` (links loans to accounts with purchase objective), `Account` (contains the account numbers referenced)
- The `CustomPurchaseAccountMapping` pattern will be used (configuration-driven rather than code-based)

**Configuration Structure:**
- Add three new mapping entries to the JSON configuration file
- Each mapping will specify:
  - Investor name: "Pagaya" (not ID-based)
  - Source field path: either `Larixdb..loansummary.field3` or `Farixdb..loansummary.field19.account_name`
  - Match value: exact string match ("Pagaya-2025-REV1", "PT-Lumin-Trust", "PAID 26-218")
  - Target account number: the destination account for purchases
  - Account objective: "Purchase" (no other objectives needed)
- Mappings are additive, not replacing existing Pagaya configurations

**Account Resolution Flow:**
- The account resolution utility in `cos-lending-selling-data-utils` runs as an ECS task triggered by Airflow DAGs in `cos-lending-selling-dags`
- It queries the Arix database for loan field values (field3 and field19.account_name)
- It evaluates each loan against the mapping rules in the JSON configuration
- For matches, it calls the CRB.CosLending.Accounting.Api `POST /Accounting/v1/LoanAccounting/LoanActionsAccounts` endpoint to validate/register account mappings
- It updates the Selling database's LoanAccount table with the account number and purchase objective
- The WebApi purchase workflow queries LoanAccount to find the correct purchase account when creating Transfer entities

**Service Interactions:**
- `cos-lending-selling-dags` → `cos-lending-selling-data-utils`: Orchestrates account resolution runs via ECS task
- `cos-lending-selling-data-utils` → Arix Database: Queries loan field values
- `cos-lending-selling-data-utils` → CRB.CosLending.Accounting.Api: Validates account configurations
- `cos-lending-selling-data-utils` → Cos.Lending.Selling.DbModel: Updates LoanAccount table
- `COS.Lending.Selling.WebApi` → Cos.Lending.Selling.DbModel: Queries LoanAccount for purchase operations

**Deployment Strategy:**
- Deploy configuration change to DEV environment first
- Run account resolution utility in DEV and validate mappings in database
- Deploy to QA environment after DEV validation
- Perform comprehensive testing in QA including existing Pagaya accounts
- Deploy to PROD after QA sign-off
- Monitor PROD account resolution runs to confirm new mappings are working

**Validation Approach:**
- Query the LoanAccount table for loans with matching field values
- Verify account_number matches expected values (2952696942, 2869976205, 3943697015)
- Verify objective is set to "Purchase"
- Verify investor is associated with Pagaya
- Run test purchases in lower environments to ensure end-to-end flow works

**Architectural Patterns Used:**
- Configuration-driven account resolution (externalized business rules)
- Repository pattern for data access in account resolution utility
- ELT pattern: Extract field values from Arix, Load into Selling DB, Transform via account mapping logic
- Event-driven: Account resolution updates may trigger downstream events via outbox pattern

**API Contracts:**
- No new API endpoints required
- Existing endpoint used: `POST /Accounting/v1/LoanAccounting/LoanActionsAccounts` (CRB.CosLending.Accounting.Api) for account validation

**Data Consistency:**
- Account resolution is idempotent - can be run multiple times without duplicating mappings
- Runs are scheduled via Airflow ensuring consistent, automated updates
- Historical loans may need account resolution re-run if they existed before configuration deployment

## Testing Decisions

**Module Testing:**
- `cos-lending-selling-data-utils`: Unit tests or integration tests that load the JSON configuration and verify mapping logic
- Tests should verify that given specific field3/field19 values, the correct account numbers are returned
- Test that existing mappings are not affected by new additions (regression testing)
- Test edge cases: null field values, partial matches, case sensitivity

**Test Characteristics:**
- Test external behavior: Given loan field values, assert correct account numbers are mapped in LoanAccount table
- Do not test implementation details of JSON parsing or internal data structures
- Use actual field values from the ticket (Pagaya-2025-REV1, PT-Lumin-Trust, PAID 26-218) in test data

**Prior Art:**
- `cos-lending-selling-e2e-tests` contains end-to-end scenarios that validate account resolution and purchase flows
- Look for existing tests that validate CustomPurchaseAccountMapping behavior
- Follow patterns in existing account resolution tests that assert LoanAccount relationships

**Integration Testing:**
- `cos-lending-selling-e2e-tests`: Create or update end-to-end test scenarios that include loans with the new field values
- Validate that loans are purchased to the correct accounts
- Validate that Transfer entities are created with proper source/destination accounts
- Test in a simulated environment that includes the COS simulator and mock accounting service

**Manual Testing in DEV/QA:**
- Identify or create test loans in Arix with field3="Pagaya-2025-REV1", verify account 2952696942 is mapped
- Identify or create test loans in Arix with field3="PT-Lumin-Trust", verify account 2869976205 is mapped
- Identify or create test loans in Farix with field19.account_name="PAID 26-218", verify account 3943697015 is mapped
- Run full purchase workflow for these test loans and verify transfers succeed
- Query LoanAccount table to confirm objective is "Purchase" and investor is Pagaya

**SQL Validation Queries:**
```sql
-- Verify mapping for Pagaya-2025-REV1
SELECT l.loan_id, l.loan_number, la.account_number, la.objective 
FROM loans l 
JOIN loan_accounts la ON l.loan_id = la.loan_id 
WHERE l.field3 = 'Pagaya-2025-REV1' AND la.objective = 'Purchase';

-- Verify mapping for PT-Lumin-Trust
SELECT l.loan_id, l.loan_number, la.account_number, la.objective 
FROM loans l 
JOIN loan_accounts la ON l.loan_id = la.loan_id 
WHERE l.field3 = 'PT-Lumin-Trust' AND la.objective = 'Purchase';

-- Verify mapping for PAID 26-218
SELECT l.loan_id, l.loan_number, la.account_number, la.objective 
FROM loans l 
JOIN loan_accounts la ON l.loan_id = la.loan_id 
WHERE l.field19_account_name = 'PAID 26-218' AND la.objective = 'Purchase';
```

**Monitoring:**
- Monitor CloudWatch logs from account resolution runs for any errors related to new mappings
- Monitor that loan counts for new account numbers increase after deployment
- Track Transfer creation to new account numbers to ensure purchase workflow is functioning

## Out of Scope

**Explicitly NOT included in this change:**
- Creation of the three new Account entities in the database (assumes accounts already exist or will be created by another process)
- Changes to the WebApi purchase workflow logic (existing logic already handles any purchase account)
- Updates to interest accrual or fee collection account mappings (only purchase objective is configured)
- Migration of historical loans to new accounts (only new/future loans with matching field values will use new accounts)
- Changes to investor configuration or investor entity for Pagaya (using existing investor record)
- UI changes to display new account mappings (no UI component in this change)
- Reporting or analytics updates to track purchases by new accounts (existing reports will naturally include new accounts)
- Changes to contract configurations or fee structures for Pagaya
- Updates to other investors' account mappings
- Changes to the account resolution algorithm or matching logic (only adding configuration data)
- Database schema changes or migrations
- New API endpoints or modifications to existing endpoints
- Changes to Airflow DAG scheduling or orchestration logic (uses existing account resolution DAG)
- Updates to dbt models in `cos-lending-selling-datatools` (models query LoanAccount table which will already reflect new mappings)
- Changes to AI service queries or chat interfaces
- Updates to hooks or notification integrations
- Modifications to batch processing or approval workflows
- Changes to authentication, authorization, or RBAC configurations

**Assumptions:**
- The three account numbers (2952696942, 2869976205, 3943697015) already exist as valid Account entities in the system, or will be created outside this ticket
- The Pagaya investor entity already exists in the Investor table
- The account resolution utility already has logic to parse and evaluate custom purchase account mappings from JSON
- Loans with the specified field values will naturally appear in the system through normal loan ingestion from Arix
- The JSON configuration file exists and has a known structure (to be examined during implementation)

## Further Notes

**Dependencies:**
- Account creation: The three new account numbers must exist in the Account table before loans can be mapped to them. Coordinate with operations or accounting teams to ensure accounts are provisioned.
- Investor validation: Confirm that "Pagaya" investor name in configuration matches the exact name in the Investor table for proper association.
- Airflow scheduling: Account resolution runs on a schedule defined in `cos-lending-selling-dags`. Ensure the schedule is appropriate for timely mapping of new loans.

**Risks:**
- Field value changes: If Arix changes the format or values in field3 or field19.account_name, mappings will break. Mitigate by validating test data matches production patterns.
- Account validation failures: If the CRB.CosLending.Accounting.Api rejects the account mappings, account resolution will fail. Test in DEV first to catch any account configuration issues.
- Existing mapping conflicts: If there are overlapping rules for the same field values, behavior may be unpredictable. Review existing Pagaya mappings to ensure no conflicts.
- Partial string matches: Ensure mapping logic uses exact string matching to avoid unintended matches (e.g., "Pagaya-2025-REV10" should not match "Pagaya-2025-REV1").

**Configuration File Investigation:**
- During implementation, first step is to locate and examine the JSON configuration file in the root of `cos-lending-selling-data-utils`
- Understand the existing structure by reviewing other Pagaya or investor mappings
- Follow the exact format and conventions used in existing mappings to ensure consistency
- Validate JSON syntax after making changes to avoid runtime parsing errors

**Rollback Plan:**
- If issues are discovered after deployment, configuration can be quickly reverted by removing the three new mapping entries and redeploying
- Re-run account resolution utility after rollback to revert LoanAccount mappings if necessary
- Low risk change since it's purely additive configuration

**Success Criteria:**
- Configuration deployed to all environments (DEV, QA, PROD)
- Account resolution utility successfully maps loans with specified field values to correct account numbers
- Purchase transfers execute successfully using the new account mappings
- Existing Pagaya account mappings continue to work without regression
- No errors in account resolution logs related to new mappings

**Open Questions:**
- Are the three account numbers already provisioned in the Account table in DEV, QA, and PROD?
- What is the expected volume of loans that will match these new field values?
- Are there any reporting or reconciliation requirements specific to these new accounts?
- Should we add monitoring alerts for successful mapping counts to these new accounts?
