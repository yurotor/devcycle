# Account Resolution and Management

The Account Resolution and Management flow manages the lifecycle of financial accounts associated with loans in the lending system. It starts with resolving the correct accounts for different loan operations (purchase, return, interest, fees) from multiple data sources including the accounting system and loan operations database. Once resolved, these account mappings are stored in the selling database for financial operations.

The flow continues with ongoing account management as loans move through various states (origination, purchase, servicing). When loan attributes change (investor changes, loan type grooming), the system updates account mappings accordingly. The process includes custom account mapping logic based on specific loan details, fee sweep account resolution, and automated cleanup of outdated account references.

## Steps

1. 1: Account resolution - Query accounting system and loan operations database to identify the correct accounts for loans
2. 2: Account mapping - Associate loan with proper purchase, return, interest, and fee accounts based on loan attributes
3. 3: Custom mapping application - Apply any custom purchase account mappings based on specific loan details
4. 4: Fee sweep account resolution - Determine appropriate accounts for fee processing
5. 5: Loan source account mapping - Map accounts based on loan source information
6. 6: Database update - Store resolved account mappings in the selling database
7. 7: Account verification - Validate accounts exist and have proper configurations
8. 8: Ongoing management - Update account mappings when loan attributes change
9. 9: Account cleanup - Remove outdated or unused account references

## Repos Involved

[cos-lending-selling-data-utils](../repos/cos-lending-selling-data-utils.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-e2e-tests](../repos/cos-lending-selling-e2e-tests.md)

## Data Entities

[Loan](../data-model/entities.md), [LoanAccount](../data-model/entities.md), [ObjectiveAccount](../data-model/entities.md), [FeeSweep](../data-model/entities.md), [CustomPurchaseAccountMapping](../data-model/entities.md), [Account](../data-model/entities.md), [Transfer](../data-model/entities.md), [Batch](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [AccountConfig](../data-model/entities.md)

## External Systems

- CRB.CosLending.Accounting.Api
- MPLConsumerLoansOperations
- Cross River Bank COS

## Open Questions

- The relationship between ObjectiveAccount in cos-lending-selling-data-utils and Account entity in Cos.Lending.Selling.DbModel is not clearly defined
- The mechanism for handling account resolution failures in the cos-lending-selling-data-utils repository is not specified
- The conditions that trigger account remapping in COS.Lending.Selling.WebApi during loan lifecycle changes are not fully documented

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T12:35:48.598Z*