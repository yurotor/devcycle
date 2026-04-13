# CLN-2949 Implementation Summary

**Ticket**: Pagaya mapping - additional accounts  
**Completed**: 2026-04-13  
**Status**: Ready for Build & Deployment

## Changes Implemented

### 1. Configuration Update ✅
**File**: `cos-lending-selling-data-utils/custom-purchase-accounts.json`

**Added**:
```json
{
  "mpl": "FFF",
  "field": "Field19",
  "jsonPath": "pagaya_selected_offer.pagaya_additional_info.allocated_investment_account.account_name",
  "value": "PAID 26-2",
  "accountNumber": "183943697015"
}
```

**Already Existed** (No action needed):
- RKL + Field3 + "Pagaya-2025-REV1" → 2952696942
- RKL + Field3 + "PT-Lumin-Trust" → 2869976205

### 2. Test Coverage Added ✅
**File**: `COS.Lending.Selling.DataTools.AccountsResolver.Tests/CustomPurchaseAccountsServiceTests.cs`

**New Test**: `ReplaceCustomPurchaseAccounts_WithPagayaSelectedOfferPAID262_ReplacesAccount`
- Tests the complete nested JSON path structure
- Validates correct account assignment (183943697015)
- Follows existing test patterns

## Technical Details

### How It Works
1. Account resolver loads `custom-purchase-accounts.json` at startup
2. For FFF loans during account resolution:
   - Retrieves `LoanDetails.Field19` (JSON string)
   - Parses nested JSON: `pagaya_selected_offer.pagaya_additional_info.allocated_investment_account.account_name`
   - If value = "PAID 26-2", overrides purchase account to 183943697015
3. Logs replacement: `"Replaced purchase account for LoanId {id}, MPL FFF: {old} -> 183943697015"`

### JSON Structure Expected
Field19 should contain:
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

## Files Modified

1. `/kb/repos/cos-lending-selling-data-utils/custom-purchase-accounts.json`
   - Added 1 new mapping entry (inserted after PAID 26-1)

2. `/kb/repos/cos-lending-selling-data-utils/COS.Lending.Selling.DataTools.AccountsResolver.Tests/CustomPurchaseAccountsServiceTests.cs`
   - Added 1 new unit test (lines 144-175 approx)

## Next Steps

### Immediate Actions
1. **Create Pull Request** with these changes
2. **Code Review** - have team review the mapping and test
3. **CI/CD Pipeline** - ensure tests pass in build environment
4. **QA Validation** - test with sample FFF loans containing PAID 26-2

### Deployment Sequence
1. **Dev** → Validate mapping works with test data
2. **QA** → Comprehensive testing
3. **Staging** → Production-like validation
4. **Production** → Deploy during off-peak hours

### Validation Checklist
- [ ] Build succeeds in CI/CD
- [ ] All unit tests pass
- [ ] Integration test with FFF loan containing PAID 26-2
- [ ] Verify account 183943697015 correctly assigned
- [ ] Monitor logs for successful mapping messages
- [ ] Confirm no regressions in existing mappings

## Documentation

- **Deployment Plan**: See `CLN-2949-deployment-plan.md`
- **Test Coverage**: 15 total tests in CustomPurchaseAccountsServiceTests
- **Risk Level**: LOW (configuration-only, additive change)

## Rollback Plan

If issues occur:
1. Revert to previous version of `custom-purchase-accounts.json`
2. Redeploy service
3. No database changes required

## Key Contacts

- **Engineering**: [Team Lead]
- **Product**: [Product Owner for Pagaya partnership]
- **Operations**: [On-call team for account resolution]
- **Pagaya**: [Account Manager]

## References

- Ticket: CLN-2949
- Feature: Account Resolution and Mapping
- Service: `CustomPurchaseAccountsService`
- Config: `AccountsResolverOptions.CustomPurchaseAccountsMappingFilePath`
