# Auto Purchase Flow

## 1. Overview

The Auto Purchase Flow feature automates the loan purchasing process based on predefined eligibility criteria in contracts. This feature eliminates the need for manual intervention when evaluating whether loans meet the requirements for purchase, improving operational efficiency and reducing human error. 

The feature exists to:
- Streamline the loan acquisition pipeline
- Ensure consistent application of eligibility rules
- Accelerate the purchase cycle time
- Reduce operational overhead for both Cross River Bank and MPLs (Marketplace Lenders)

## 2. How It Works

The Auto Purchase Flow follows these sequential steps:

1. **Loan Ingestion**: New loans are ingested into the system through established data pipelines.

2. **Eligibility Evaluation**: Each loan is automatically evaluated against the eligibility criteria defined in the associated contract terms. These criteria may include:
   - Loan amount ranges
   - Interest rate thresholds
   - Credit score requirements
   - Term length specifications
   - Geographic restrictions
   - Other configurable parameters

3. **Auto-Purchase Flagging**: Loans meeting all eligibility requirements are flagged for auto-purchase.

4. **Batch Creation**: The system groups eligible loans into batches for efficient processing.

5. **Batch Initialization**: A message is sent to the BatchInitOutbox queue to initialize the batch processing workflow.

6. **Automated Purchase Processing**: The system executes the purchase transaction for all loans in the batch without human intervention.

7. **Notification**: Upon completion, the system sends notifications to relevant stakeholders about the successful purchase.

## 3. Repos Involved

- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Provides the API endpoints for loan evaluation, batch management, and purchase execution.
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Defines the data structures for loans, contracts, eligibility criteria, and purchase transactions.
- [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md): Contains the Airflow DAGs that orchestrate the batch processing workflows for auto purchases.

## 4. Key APIs

- `GET /api/loans` - Retrieves loans that can be evaluated for auto-purchase
- `GET /api/loans/{id}` - Gets detailed information about a specific loan
- `GET /api/batches` - Lists batches of loans processed through auto-purchase
- `POST /api/transfers` - Initiates the transfer of funds for purchased loans

## 5. Data Entities

- [Loan](../data-model/loan.md): Contains loan details and eligibility attributes
- [Contract](../data-model/contract.md): Defines the eligibility criteria for auto-purchase
- [Batch](../data-model/batch.md): Groups loans for processing through the auto-purchase flow
- [Transfer](../data-model/transfer.md): Records the financial transaction resulting from the loan purchase
- [LoanAction](../data-model/loan-action.md): Tracks actions performed on loans throughout the auto-purchase process
- [Account](../data-model/account.md): Represents the financial accounts involved in the purchase transaction
- [Mpl](../data-model/mpl.md): Contains information about the marketplace lender selling the loan

This automated flow significantly reduces the operational burden of manual reviews while maintaining strict adherence to contractual requirements.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) | [cos-lending-selling-dags](../repos/cos-lending-selling-dags.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T12:37:55.009Z*