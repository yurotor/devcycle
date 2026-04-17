# Integration and Enhanced Services

## Shared Entities

- **Loan** — Core loan entity with loan number, status, and related details that flows from ingestion to AI services and generates events in hooks ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))
- **LoanSaleStatus** — Tracks the sale status of loans, ingested by the ingestion service and published as events by hooks ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **Investor** — Entity representing loan investors, tracked in ingestion and published as change events by hooks ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))

## Data Flows

### Loan Data Ingestion and Notification Flow

External loan and servicing data is ingested, processed, and changes trigger notifications for downstream consumers

  1. Data retrieved from external sources (Federal Reserve API, S3, Athena) by cos-lending-selling-ingestion
  2. Data stored in databases (sellingdb, vampire-database, etc.)
  3. Loan state changes detected
  4. Events published via COS.Lending.Selling.Hooks
  5. Notifications consumed by downstream systems
### AI-Powered Loan Insight Flow

User questions about loans are answered using AI and underlying loan data

  1. User submits question about loans through AI service
  2. Service authenticates via Identity Server
  3. Service accesses loan data from PostgreSQL database
  4. Question processed through AWS Bedrock LLM
  5. Response streamed back to user with insights about loans

## Integration Points

- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** → **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** via Database: Ingestion service updates loan data in shared database that triggers hooks service to detect changes and publish events
- **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** → **[CosLending Hooks Hub](../repos/coslending-hooks-hub.md)** via Messaging: Loan state change events published to central hooks hub for broader consumption
- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** → **[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)** via Database: AI service reads loan data populated by the ingestion service to answer questions about loans
- **[cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md)** → **[AWS CloudWatch](../repos/aws-cloudwatch.md)** via Messaging: Business metrics sent to CloudWatch for monitoring the ingestion process

## Patterns

- **Webhook Publisher** — Standardized notification mechanism for loan-related events using a hooks pattern ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **Data Ingestion Pipeline** — Consolidating data from multiple sources into a unified data store for downstream consumption ([cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))
- **AI-Powered Knowledge Base** — Natural language interface to structured data using LLMs ([cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))
- **Event-Driven Architecture** — System components communicate through events rather than direct calls ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md), [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md))

## Open Questions

- Exact database schema and relationships between the shared entities across repositories
- Whether the AI service consumes events from the hooks service directly or just reads the database
- Authentication and authorization flow details between the three services
- Error handling and data consistency mechanisms across the integrated components
- How real-time the AI insights are relative to data ingestion timing

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-16T12:55:41.326Z*