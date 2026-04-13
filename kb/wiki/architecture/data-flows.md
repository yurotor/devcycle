# Data Flows

Major end-to-end data flows through the system.

## Loan Purchase and Funding Flow

End-to-end flow from loan origination to investor purchase

1. 1. MPL originates loan in external system (Arix)
2. 2. cos-lending-selling-ingestion syncs loan data from Arix to Selling DB
3. 3. cos-lending-selling-data-utils resolves and maps accounts for the loan via COS.Lending.Accounting.Api
4. 4. Loan becomes eligible for purchase based on contract terms and seasoning period
5. 5. WebApi AutoPurchaseService identifies eligible loans
6. 6. Batch is created grouping loans for purchase
7. 7. WebApi PurchaseLoans business logic (F#) validates and processes purchase
8. 8. TransferOutboxProcessor creates transfer requests for loan principal movement
9. 9. Transfer requests sent to COS (Core Operating System) for execution
10. 10. TransferStatusSyncService monitors transfer completion
11. 11. BatchCompletionService finalizes batch when all transfers complete
12. 12. Hooks service publishes BatchPurchaseCompleted notification
13. 13. Invoice and Receipt generated and stored
## Daily Interest Accrual Flow

Automated daily interest calculation and collection

1. 1. Airflow DAG triggers daily interest calculation job (scheduled)
2. 2. DailyInterestOutboxHandler in WebApi calculates interest for all active sold loans
3. 3. Interest calculations use contract terms (rate, day count convention, pass-through rules)
4. 4. Interest records written to InterestHistory table
5. 5. Transfer requests created in TransferOutbox for interest payments
6. 6. TransferOutboxProcessor sends transfer requests to COS
7. 7. Interest transferred from loan interest account to investor account
8. 8. cos-lending-selling-ingestion updates CloudWatch metrics with daily interest totals
9. 9. Reporting DAG exports interest data to S3 for analytics
## Fee Collection Flow

Collection of various fees during loan lifecycle

1. 1. Fee collection triggered by loan events (origination, purchase, monthly processing)
2. 2. WebApi identifies fees based on contract configuration (DMV, Florida Stamp Tax, Loan Payoff Shortfall, Merchant Fees)
3. 3. AutoFeeSweepService calculates fee amounts
4. 4. Fee records created with status tracking
5. 5. FeeOutbox entries created for processing
6. 6. FeeOutboxProcessor sends transfer requests to COS
7. 7. Fees transferred from MPL account to bank fee collection account
8. 8. Fee history tracked for audit and reporting
## Volume Fee and True-Up Flow

Monthly volume fee calculation with periodic true-up adjustments

1. 1. Monthly volume fee calculation triggered by Airflow DAG
2. 2. WebApi calculates volume based on loan purchase volumes by MPL
3. 3. Contract defines tiered volume fee structure with minimum thresholds
4. 4. VolumeFeeOutboxProcessor creates transfer for monthly fee
5. 5. Fee charged to MPL account
6. 6. Periodic true-up process reconciles actual vs. charged volume fees
7. 7. TrueUpVolumeFeeOutbox handles adjustments (credits or additional charges)
8. 8. Hooks service publishes TrueUpVolumeFeeCharged notification
9. 9. Reporting exports volume fee data for MPL billing
## Loan Grooming Flow

Process for changing loan investor or loan type

1. 1. User initiates grooming request via UI (change investor or loan type)
2. 2. WebApi creates PendingApproval record with grooming details
3. 3. Approval workflow validates business rules and account availability
4. 4. Upon approval, GroomingProcess record tracks state transitions
5. 5. WebApi business logic calculates retroactive interest adjustments if needed
6. 6. Account transfers reverse original purchase and re-execute with new investor/type
7. 7. LoanAccount mappings updated with new account relationships
8. 8. Hooks service publishes InvestorChanged or LoanTypeChanged event
9. 9. UI reflects updated loan status and history
## Servicing Data Ingestion and Reconciliation Flow

Regular synchronization of loan servicing data from MPLs

1. 1. MPLs upload servicing CSV files to designated S3 buckets
2. 2. Airflow DAG detects new files and triggers ingestion task
3. 3. cos-lending-selling-ingestion reads CSV files from S3
4. 4. Servicing data (adjusted loan amounts, interest paid, loan status) validated and parsed
5. 5. Data written to Selling DB servicing tables
6. 6. cos-lending-selling-ingestion syncs loan status from Arix to Selling DB
7. 7. Reconciliation logic identifies discrepancies between systems
8. 8. Discrepancy records created for investigation
9. 9. CloudWatch metrics updated with servicing data freshness by MPL
10. 10. dbt transformations create curated views of servicing data
## AI-Powered Loan Query Flow

Natural language queries about loan history and details

1. 1. User asks question about loan via UI chat interface
2. 2. UI creates or retrieves chat session via cos-lending-selling-ai API
3. 3. cos-lending-selling-ai retrieves session history from DynamoDB
4. 4. User message appended to session
5. 5. AI service constructs prompt with loan schema and history context
6. 6. AWS Bedrock (Claude) generates SQL query and natural language response
7. 7. Generated SQL executed against Selling DB to retrieve loan details
8. 8. Response streamed back to UI via Server-Sent Events
9. 9. Message history saved to DynamoDB for context in future queries
10. 10. UI displays formatted response with loan insights
## Reporting and Analytics Flow

Generation of pre-sale and post-sale reports for stakeholders

1. 1. Airflow DAG schedules reporting jobs (pre-sale, post-sale, volume reports)
2. 2. ReportingService (F#) in WebApi queries Selling DB for relevant data
3. 3. Data formatted into CSV reports with MPL-specific customizations
4. 4. Reports stored in S3 buckets with organized folder structure
5. 5. ReportingOutbox triggers report generation completion events
6. 6. dbt models in cos-lending-selling-datatools create curated analytics views
7. 7. Transformed data exported to data warehouse for BI tools
8. 8. External teams access reports via S3 or query warehouse directly

---

> See also: [System Overview](./system-overview.md) | [Service Map](./service-map.md)

*Generated: 2026-04-13T06:16:29.479Z*