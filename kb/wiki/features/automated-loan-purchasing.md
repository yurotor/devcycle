# Automated Loan Purchasing

## 1. Overview

The Automated Loan Purchasing feature enables Marketplace Lenders (MPLs) to configure rule-based automation for acquiring eligible loans without manual intervention. This feature serves several key business purposes:

- **Operational Efficiency**: Reduces the need for manual review and approval of each individual loan
- **Speed to Market**: Accelerates the loan acquisition process, allowing MPLs to build their portfolios faster
- **Consistency**: Applies uniform criteria for loan selection, reducing human error and variability
- **Scalability**: Supports handling large volumes of loans without proportional staffing increases

MPLs can define specific criteria such as loan type, issuing bank, credit score ranges, interest rates, and contract terms that automatically trigger purchases when matching loans become available.

## 2. How It Works

The Automated Loan Purchasing process follows this workflow:

1. **Rule Configuration**: MPLs set up auto-purchase rules through the UI, defining criteria and thresholds
2. **Loan Matching**:
   - When new loans enter the system, they are automatically evaluated against the configured rules
   - The matching engine compares loan attributes against rule criteria
   - Rules are processed in priority order if multiple rules match
3. **Validation & Compliance**:
   - Before purchase, the system validates MPL purchasing capacity, compliance requirements, and contract terms
   - Regulatory checks ensure the purchase complies with applicable laws
4. **Automated Purchase**:
   - When a loan matches rules and passes validation, the system initiates the purchase transaction
   - A new `Transfer` record is created, moving the loan to the MPL's portfolio
5. **Batch Processing**:
   - Matching loans are grouped into batches for efficient processing
   - Each batch receives a unique identifier for tracking and reporting
6. **Notification & Reporting**:
   - The system notifies MPLs of completed auto-purchases
   - Transaction details are recorded for audit and reporting purposes

The feature supports both real-time processing for individual loans and scheduled batch processing for larger volumes.

## 3. Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Implements the backend logic for rule processing, loan matching, validation, and transfer execution
- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): Provides the interface for configuring auto-purchase rules, viewing purchase history, and monitoring automated transactions

## 4. Key APIs

**Rule Management APIs:**
- `POST /api/autopurchase/rules` - Create a new auto-purchase rule
- `PUT /api/autopurchase/rules/{id}` - Update an existing rule
- `GET /api/autopurchase/rules` - List all configured rules
- `DELETE /api/autopurchase/rules/{id}` - Remove a rule

**Purchase Processing APIs:**
- `POST /api/transfers` - Creates transfer records for purchased loans
- `GET /api/batches` - Retrieves batch information for automated purchases
- `GET /api/loans` - Retrieves loans eligible for auto-purchase
- `POST /api/reports` - Generates reports on auto-purchase activity

## 5. Data Entities

- [Loan](../data-model/entities.md#loan) - The core entity representing a loan that can be auto-purchased
- [LoanAction](../data-model/entities.md#loanaction) - Records actions performed on loans, including auto-purchase events
- [Transfer](../data-model/entities.md#transfer) - Represents the transfer of loan ownership from issuing bank to MPL
- [Contract](../data-model/entities.md#contract) - Defines the terms under which loans can be purchased
- [Account](../data-model/entities.md#account) - Represents MPL accounts with auto-purchase capabilities
- [Batch](../data-model/entities.md#batch) - Groups loans processed together in automated purchases
- [AutoPurchaseRule](../data-model/entities.md#autopurchaserule) - Stores the criteria and configuration for automated purchasing

The automated purchasing feature interacts closely with the loan servicing and financial modules to ensure proper accounting of transferred assets and payment streams.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:23:41.460Z*