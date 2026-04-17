# Data Flows

Major end-to-end data flows through the system.

## Loan Purchase End-to-End Flow

Complete workflow from loan availability through purchase completion with interest and fee settlements

1. 1. Loan originates in Arix system (external Core Banking System)
2. 2. cos-lending-selling-ingestion syncs loan data from Arix MSSQL to Selling PostgreSQL database
3. 3. cos-lending-selling-dags Airflow DAG runs loan curation to determine if loan is ready for purchase based on grooming criteria
4. 4. Loan status changes to 'Ready for Purchase' in COS.Lending.Selling.WebApi
5. 5. MPL (Marketplace Lender) views available loans in COS.Lending.Selling.UI and initiates purchase
6. 6. COS.Lending.Selling.WebApi creates BatchInitOutbox entry and publishes to SQS
7. 7. BatchInitOutboxProcessor creates transfers for loan principal, interest, and volume fees
8. 8. Transfers are sent to COS (Core Operating System) for execution via transfer API
9. 9. TransferStatusSyncService polls COS to confirm transfer completion
10. 10. Upon transfer completion, AutoPurchaseService or user action completes the purchase
11. 11. BatchCompletionService marks batch as completed
12. 12. COS.Lending.Selling.Hooks publishes BatchPurchaseCompleted notification
13. 13. Daily interest accrual begins via DailyInterestOutboxHandler for purchased loans
14. 14. cos-lending-selling-ai enables natural language queries about loan purchase history
15. 15. cos-lending-selling-dags exports data for reporting and analytics
## Interest Accrual Daily Process

Automated daily calculation and transfer of interest for purchased loans

1. 1. cos-lending-selling-dags Airflow DAG triggers daily interest accrual job at scheduled time
2. 2. Interest calculation uses contract terms (Standard, SOFR, or Combined method) with SOFR rates from Federal Reserve
3. 3. DailyInterestOutbox entries are created for each loan requiring interest accrual
4. 4. DailyInterestOutboxHandler processes entries and creates transfer requests (normal, retroactive, or correction)
5. 5. Transfers are submitted to COS transfer system for execution
6. 6. InterestHistory table is updated with accrual records
7. 7. TransferStatusSyncService monitors transfer completion
8. 8. Interest amounts are reflected in LoanAccount balances
9. 9. cos-lending-selling-datatools aggregates interest data for reporting
10. 10. CloudWatch metrics track daily interest accrual volumes
## Fee Collection and True-Up Flow

Processing of various fees including volume fees, DMV fees, and monthly true-up adjustments

1. 1. FeeOutbox entries created when fees are due based on contract terms
2. 2. FeeCollectionOutboxProcessor handles DMV fees, Florida stamp tax, loan payoff shortfall, and merchant fees
3. 3. VolumeFeeOutboxProcessor calculates volume fees based on loan volume and contract fee method
4. 4. Transfers created for each fee type between appropriate accounts (from LoanAccount to fee sweep accounts)
5. 5. Transfers submitted to COS for execution
6. 6. At end of month, cos-lending-selling-dags triggers monthly minimum fee calculation
7. 7. TrueUpVolumeFeeOutboxProcessor compares actual fees collected vs monthly minimum
8. 8. If shortfall exists, TrueUpVolumeFee transfer is created to collect difference
9. 9. COS.Lending.Selling.Hooks publishes TrueUpVolumeFeeCharged notification
10. 10. cos-lending-selling-datatools exports fee data for financial reconciliation
## Servicing Data Ingestion Flow

Import of loan servicing data from external MPL systems via S3

1. 1. MPL (Marketplace Lender) uploads servicing CSV file to S3 bucket
2. 2. cos-lending-selling-dags Airflow DAG detects new file in S3
3. 3. cos-lending-selling-ingestion reads and validates CSV file structure
4. 4. Servicing data (adjusted_loan_amount, interest_paid) extracted and transformed
5. 5. SellingDB PostgreSQL updated with servicing values for affected loans
6. 6. Servicing timestamp recorded to track ingestion time per MPL
7. 7. File moved to processed folder in S3
8. 8. CloudWatch metrics updated with servicing data ingestion counts
9. 9. cos-lending-selling-datatools makes data available for analytics via dbt models
10. 10. Loan balances and status may update based on servicing data
## AI-Powered Loan Query Flow

Natural language question answering about loan history and financial calculations

1. 1. User asks question about loan in COS.Lending.Selling.UI loan history chat interface
2. 2. UI calls cos-lending-selling-ai /chat endpoint with user_id and loan_id
3. 3. cos-lending-selling-ai creates or retrieves existing chat session from DynamoDB
4. 4. User message submitted to /chat/{session_id}/message endpoint
5. 5. AI service constructs prompt with database schema context and conversation history
6. 6. AWS Bedrock Claude model generates SQL query and natural language response
7. 7. SQL query extracted and validated (SELECT-only, no destructive operations)
8. 8. Query executed against PostgreSQL SellingDB to retrieve loan data
9. 9. Results incorporated into AI response with explanation
10. 10. Response streamed back to UI via Server-Sent Events
11. 11. Conversation history stored in DynamoDB for context retention
12. 12. UI displays formatted response with SQL query and results
## Loan Grooming and Type Change Flow

Process for changing loan characteristics such as loan type or investor

1. 1. User initiates loan type change (HFS to LTHFS or RET) in COS.Lending.Selling.UI
2. 2. Request validated in COS.Lending.Selling.WebApi against grooming rules
3. 3. GroomingProcess entity created to track the operation
4. 4. Reverse interest calculation performed to adjust accrued interest
5. 5. Principal transfer initiated to move loan balance to new account structure
6. 6. Loan type or investor updated in database
7. 7. COS.Lending.Selling.Hooks publishes InvestorChanged or LoanTypeChanged event
8. 8. Subsequent interest accruals use new loan type and account structure
9. 9. cos-lending-selling-data-utils resolves new account mappings for the loan
10. 10. cos-lending-selling-dags exports grooming data for audit trail

---

> See also: [System Overview](./system-overview.md) | [Service Map](./service-map.md)

*Generated: 2026-04-16T12:55:41.324Z*