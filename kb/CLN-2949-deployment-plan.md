# CLN-2949: Pagaya Mapping Deployment Plan

**Ticket**: CLN-2949 - Pagaya mapping - additional accounts  
**Date**: 2026-04-13  
**Change Type**: Configuration Update

## Summary
Add new Pagaya account mapping for FFF loans with "PAID 26-2" identifier routing to account 183943697015.

## Changes Made

### 1. Configuration File Update
**File**: `cos-lending-selling-data-utils/custom-purchase-accounts.json`

**Change**: Added new mapping entry
```json
{
  "mpl": "FFF",
  "field": "Field19",
  "jsonPath": "pagaya_selected_offer.pagaya_additional_info.allocated_investment_account.account_name",
  "value": "PAID 26-2",
  "accountNumber": "183943697015"
}
```

**Note**: Two other mappings mentioned in the ticket already exist:
- "Pagaya-2025-REV1" → 2952696942 (RKL)
- "PT-Lumin-Trust" → 2869976205 (RKL)

### 2. Test Coverage
**File**: `COS.Lending.Selling.DataTools.AccountsResolver.Tests/CustomPurchaseAccountsServiceTests.cs`

**Added Test**: `ReplaceCustomPurchaseAccounts_WithPagayaSelectedOfferPAID262_ReplacesAccount`
- Validates PAID 26-2 mapping with nested JSON path
- Ensures account 183943697015 is correctly assigned

## Deployment Steps

### Pre-Deployment Checklist
- [ ] Code changes reviewed and approved
- [ ] Unit tests pass locally
- [ ] Configuration file validated (valid JSON syntax)
- [ ] Backup current production `custom-purchase-accounts.json`

### Deployment Order
Deploy in sequence: **Dev → QA → Staging → Production**

### Per-Environment Steps

#### 1. Build & Test
```bash
cd cos-lending-selling-data-utils
dotnet restore
dotnet build
dotnet test
```

#### 2. Package
```bash
# Build Docker image or package artifacts per your deployment process
docker build -t cos-lending-selling-data-utils:cln-2949 .
```

#### 3. Deploy to Environment
```bash
# Example using your deployment tool
# Adjust based on actual deployment mechanism (Terraform, kubectl, AWS ECS, etc.)

# Ensure custom-purchase-accounts.json is included in deployment
# Verify AccountsResolverOptions.CustomPurchaseAccountsMappingFilePath points to correct location
```

#### 4. Verify Deployment
```bash
# Check service health
curl https://{environment-url}/health

# Verify configuration loaded
# Check logs for: "Loaded {Count} custom purchase account mappings"
```

### Rollback Plan
If issues arise:
1. Revert to previous deployment
2. Restore backed-up `custom-purchase-accounts.json`
3. Restart service

**Rollback Command**:
```bash
# Restore previous version
docker deploy cos-lending-selling-data-utils:{previous-tag}

# Or restore config file
cp custom-purchase-accounts.json.backup custom-purchase-accounts.json
systemctl restart account-resolver
```

## Testing & Validation

### Unit Tests
```bash
dotnet test --filter "FullyQualifiedName~CustomPurchaseAccountsService"
```
Expected: All tests pass, including new `WithPagayaSelectedOfferPAID262` test

### Integration Testing (Per Environment)

#### Test Case 1: PAID 26-2 Mapping
**Setup**: Create test FFF loan with Field19 containing PAID 26-2
```json
{
  "pagaya_selected_offer": {
    "pagaya_additional_info": {
      "allocated_investment_account": {
        "account_name": "PAID 26-2"
      }
    }
  }
}
```

**Expected Result**: 
- Loan purchase account resolves to 183943697015
- Log message: `Replaced purchase account for LoanId {id}, MPL FFF: {old} -> 183943697015`

#### Test Case 2: Existing Mappings Still Work
**Validation**: Ensure existing PAID 25-8 and PAID 26-1 mappings still function
- PAID 25-8 → 183943697015 (same account, different identifier)
- PAID 26-1 → 112944018756

### Monitoring

#### Success Metrics
- Account resolver job completes without errors
- FFF loans with PAID 26-2 identifier successfully mapped
- No increase in "mapping not found" warnings

#### Log Patterns to Monitor
```
# Success
"Replaced purchase account for LoanId {LoanId}, MPL FFF: {OldAccount} -> 183943697015"

# Potential Issues
"Custom purchase account mappings exist for MPL FFF and LoanId {LoanId}, but none of the values matched"
"LoanDetails not found for LoanId {LoanId}"
"Failed to load custom purchase account mappings"
```

#### Metrics & Alerts
- Monitor account resolution failure rate
- Track loans with MPL=FFF requiring account resolution
- Alert on any increase in unresolved accounts

## Risk Assessment

### Risk Level: **LOW**
- Configuration-only change
- Additive (does not remove existing mappings)
- Well-tested account resolution logic
- Easy rollback

### Potential Issues & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| JSON syntax error | Service fails to load mappings | Pre-deployment JSON validation, automated tests |
| Wrong account number | Funds routed incorrectly | Code review, test with non-prod data first |
| JSON path mismatch | Mapping doesn't match loans | Integration testing in Dev/QA |
| Configuration not deployed | Loans remain unmapped | Verify file in deployment package, check logs |

## Dependencies

### Upstream Systems
- **Loan Ingestion**: Loans must have Field19 populated correctly
- **Arix Database**: Source of Field19 data

### Downstream Systems
- **Purchase Flow**: Uses resolved accounts for fund transfers
- **Reporting**: Account assignments reflected in reports

## Stakeholder Communication

### Before Deployment
- [ ] Notify Pagaya relationship manager
- [ ] Inform operations team of deployment schedule
- [ ] Alert finance team of new account mapping

### After Deployment
- [ ] Confirm first successful mapping to Pagaya
- [ ] Report any issues to engineering team
- [ ] Document lessons learned

## Runbook

### If PAID 26-2 Loans Not Mapping Correctly

1. **Check logs** for warnings about field matching
2. **Verify Field19 data structure** in database matches expected JSON path
3. **Confirm MPL is "FFF"** for affected loans
4. **Test JSON path** against actual Field19 sample data
5. **Rollback** if issue persists

### If Service Performance Degrades

1. **Check mapping file size** - large files slow startup
2. **Monitor memory usage** - JSON parsing can be memory-intensive
3. **Review batch processing** - ensure BatchSize setting appropriate
4. **Scale horizontally** if needed

## Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Dev Deployment | 30 min | Include testing |
| Dev Validation | 2 hours | Process test loans |
| QA Deployment | 30 min | |
| QA Validation | 1 day | Comprehensive testing |
| Staging Deployment | 30 min | |
| Staging Validation | 2 days | Production-like data |
| Production Deployment | 30 min | Off-peak hours recommended |
| Production Validation | 1 week | Monitor continuously |

**Total Estimated Duration**: 1-2 weeks (including soak time in each environment)

## Sign-off

- [ ] Engineering Lead: _________________
- [ ] QA Lead: _________________
- [ ] Product Owner: _________________
- [ ] Operations: _________________

## References

- **Ticket**: CLN-2949
- **Repository**: cos-lending-selling-data-utils
- **Code Review**: [PR link to be added]
- **Test Results**: [Link to CI/CD pipeline]
- **Related Documentation**: 
  - Account Resolution and Mapping feature guide
  - Custom Purchase Accounts configuration guide
