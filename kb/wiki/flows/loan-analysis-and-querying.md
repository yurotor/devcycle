# Loan Analysis and Querying

The Loan Analysis and Querying flow enables users to ask questions about loans in natural language and receive intelligent, contextual responses. It begins with user queries in a conversational interface, which are processed by an AI-powered backend that interprets the intent, retrieves relevant loan data, analyzes it using Large Language Models, and returns insights. This flow maintains context across interactions and can handle complex queries about loan histories, interest calculations, transfers, and fees.

The system leverages data engineering pipelines that extract, transform and load loan data from operational systems into analytics-ready formats. These pipelines ensure that the AI querying capabilities have access to current and historical loan information, enabling accurate analysis across the loan lifecycle from origination through selling.

## Steps

1. User Authentication: User logs in and initiates a query session with authentication credentials
2. Query Submission: User submits a natural language query about loans or related entities
3. Intent Recognition: System analyzes the query to determine intent and required data entities
4. Context Management: System retrieves previous conversation context if available
5. SQL Generation: AI converts natural language to appropriate database queries
6. Data Retrieval: System fetches relevant loan data from PostgreSQL database
7. LLM Processing: Query and data are processed using AWS Bedrock LLMs
8. Response Generation: System formats comprehensive answer with relevant loan insights
9. Response Delivery: Answer is delivered to user interface via Server-Sent Events
10. Context Persistence: Conversation context is stored in DynamoDB for future queries

## Repos Involved

[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)

## Data Entities

[Loan](../data-model/entities.md), [LoanAction](../data-model/entities.md), [Transfer](../data-model/entities.md), [Fee](../data-model/entities.md), [Interest](../data-model/entities.md), [Contract](../data-model/entities.md), [Termsheet](../data-model/entities.md), [Session](../data-model/entities.md), [Message](../data-model/entities.md)

## External Systems

- AWS Bedrock
- AWS DynamoDB
- Identity Server
- AWS Secrets Manager
- COS Lending Selling Web API
- AWS S3
- AWS ECS
- PostgreSQL loan database

## Open Questions

- Integration pattern between the AI querying service and data pipeline tools
- Data freshness guarantees and synchronization frequency between operational and analytical data
- Access control policies for sensitive loan information
- Error handling and fallback mechanisms when AI processing fails

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-12T14:23:22.318Z*