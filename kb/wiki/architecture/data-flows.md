# Data Flows

Major end-to-end data flows through the system.

## Loan Purchase Flow

MPL purchases loans from Cross River Bank through automated or manual workflows, triggering financial transfers and accounting entries.

1. MPL initiates purchase request via UI or auto-purchase configuration
2. WebApi validates contract terms and loan eligibility
3. Batch is created grouping multiple loans for processing
4. WebApi generates Invoice and writes to BatchInitOutbox
5. Outbox processor triggers transfer requests to COS Transaction Service
6. Accounting API is called to retrieve account configurations via data-utils
7. Financial transfers execute (purchase price from MPL account to bank)
8. Receipt is generated confirming purchase completion
9. Hooks service publishes BatchPurchaseCompleted notification
10. UI displays updated loan ownership and batch status
## Daily Interest Accrual Flow

Automated process calculates and records interest on all active loans daily, with pass-through interest calculations for investors.

1. Airflow DAG triggers daily interest calculation job
2. WebApi identifies all active loans requiring interest accrual
3. F# business logic calculates interest based on loan type, rate, and SOFR data
4. Interest records written to InterestHistory table
5. DailyInterestOutbox entries created for each accrual
6. Outbox processor triggers transfer requests for interest collection
7. COS Transaction Service executes transfers (interest from MPL to bank)
8. InterestHistory updated with transfer confirmations
9. Datatools exports interest data to S3 for reporting
10. CloudWatch metrics updated with daily interest totals
## Data Ingestion and Synchronization Flow

External data sources are ingested, transformed, and synchronized into the Selling database to maintain current loan and contract information.

1. Airflow DAG schedules ingestion tasks on regular intervals
2. Ingestion service fetches SOFR rates from Federal Reserve API
3. CSV files from MPL servicing systems uploaded to S3
4. Ingestion service reads S3 files and parses servicing data
5. Loan status synchronized from Arix database to Selling database
6. Contract data imported from Contracts database
7. Volume data imported from Volume database
8. DBT transformations run to curate and denormalize data
9. Flyway migrations applied to update schema if needed
10. Data-utils resolves accounts for newly ingested loans
11. CloudWatch metrics published for data freshness monitoring
## Fee Collection Flow

Various fees (servicing, volume, true-up) are calculated and collected from MPL accounts according to contract terms.

1. WebApi identifies fees due based on contract configuration
2. Volume fee calculation triggered monthly based on loan volume
3. True-up volume fee calculated if monthly minimum not met
4. Fee records created with amount, type, and due date
5. FeeOutbox and VolumeFeeOutbox entries created
6. Outbox processor calls Accounting API for fee account mapping
7. Transfer requests generated for fee collection
8. COS Transaction Service executes transfers (fee from MPL to bank)
9. Transfer status monitored and updated in database
10. Hooks service publishes TrueUpVolumeFeeCharged notifications
11. Reporting exports include fee collection summaries
## Loan Type Change and Grooming Flow

Loans are reclassified or groomed based on seasoning periods and business rules, potentially changing investor allocation.

1. Airflow DAG triggers grooming job based on loan age
2. WebApi identifies loans meeting seasoning criteria
3. Loan type change business logic evaluates eligibility
4. Investor allocation rules applied based on new loan type
5. LoanTypeChanged event created with old/new type details
6. Accounting API called to determine new account mappings
7. Transfer requests generated if investor change required
8. Database updated with new loan type and investor
9. Hooks service publishes LoanTypeChanged notification
10. Hooks service publishes InvestorChanged notification if applicable
11. UI reflects updated loan classification
## AI-Powered Loan Query Flow

Users query loan history and details using natural language, with AI generating SQL and synthesizing human-readable responses.

1. User submits natural language question via UI chat interface
2. UI calls AI service /chat endpoint to create or resume session
3. AI service retrieves loan context from PostgreSQL Selling database
4. User message sent to /chat/{session_id}/message endpoint
5. AI service constructs prompt with database schema and loan context
6. AWS Bedrock (Claude) generates SQL query to answer question
7. AI service validates SQL is SELECT-only and executes against database
8. Query results formatted and sent back to Claude for summarization
9. AI streams response via Server-Sent Events to UI
10. Message history stored in DynamoDB for context retention
11. UI displays formatted answer with follow-up query capability

---

> See also: [System Overview](./system-overview.md) | [Service Map](./service-map.md)

*Generated: 2026-04-12T14:23:22.318Z*