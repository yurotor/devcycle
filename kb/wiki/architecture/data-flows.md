# Data Flows

Major end-to-end data flows through the system.

## Loan Origination to Purchase

Complete flow from loan creation through purchase by MPL

1. Loan originated in external system and ingested via cos-lending-selling-ingestion
2. Loan data synchronized to Selling DB from Arix
3. Account mappings resolved via cos-lending-selling-data-utils from Accounting API
4. Loan appears in COS.Lending.Selling.UI inventory
5. MPL selects loans and creates batch via WebApi
6. WebApi validates loan eligibility and creates batch record
7. BatchInitOutbox processes batch and initiates transfers
8. TransferOutbox creates transfer requests to COS Transaction Service
9. COS processes transfers between accounts
10. Batch status updated to completed
11. Hooks service publishes BatchPurchaseCompleted event
12. Loan ownership transferred to MPL
## Daily Interest Accrual

Automated daily interest calculation and posting

1. Airflow DAG triggers at scheduled time
2. cos-lending-selling-ingestion ensures latest SOFR rates available
3. WebApi DailyInterestOutbox processor runs
4. For each active loan, calculate interest based on contract terms and SOFR
5. Interest amount calculated using loan balance and rate
6. Interest posted to accounting system via COS.Lending.Accounting API
7. InterestHistory record created in DB
8. Transfer created for interest payment
9. Metrics published to CloudWatch
10. Completion logged
## Servicing Data Pipeline

MPL servicing data ingestion and processing

1. MPL uploads CSV servicing file to designated S3 bucket
2. Airflow servicing DAG detects new file
3. cos-lending-selling-ingestion downloads and parses CSV
4. Servicing values (adjusted_loan_amount, interest_paid) extracted
5. Data validated against loan records in DB
6. Servicing table updated with new values
7. Servicing timestamp recorded for MPL
8. File moved to processed folder in S3
9. Metrics updated for monitoring dashboard
10. dbt models refresh analytics tables
## End-to-End Loan Query via AI

User question answered by AI service with database context

1. User enters question in COS.Lending.Selling.UI chat interface
2. UI calls cos-lending-selling-ai /chat endpoint with user_id and loan_id
3. AI service creates or retrieves session from DynamoDB
4. User message posted to /chat/{session_id}/message
5. AI service constructs prompt with loan schema and history
6. AWS Bedrock (Claude) LLM processes question
7. If data needed, AI generates SQL query
8. SQL executed against Selling DB via SQLAlchemy
9. Results formatted into natural language response
10. Response streamed via SSE to UI
11. Message history persisted to DynamoDB
12. UI displays formatted response with citations

---

> See also: [System Overview](./system-overview.md) | [Service Map](./service-map.md)

*Generated: 2026-04-12T12:35:48.597Z*