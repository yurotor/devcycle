# Loan Query and Investigation

The Loan Query and Investigation flow enables users to search for loan information and analyze loan history through natural language queries. Users initiate queries through the COS.Lending.Selling.UI interface, which connects to the AI service to process natural language questions about loan details, history, transfers, interest calculations, and fees. The AI service transforms these queries into database operations, retrieves relevant loan data, and returns contextualized responses to help users investigate loan-related information.

The process leverages AWS Bedrock for natural language processing, maintains conversation context across sessions, and accesses comprehensive loan data from the PostgreSQL database. Users can explore complex loan information, view loan timelines, analyze interest breakdowns, and track transfer history without requiring technical knowledge of the underlying data structures or SQL queries.

## Steps

1. 1: User logs into COS.Lending.Selling.UI and navigates to the loan query/chat interface
2. 2: User submits a natural language question about loan details, history, interest, or transfers
3. 3: UI sends the query to cos-lending-selling-ai service with user context and authentication
4. 4: AI service processes the query using AWS Bedrock LLM to understand intent
5. 5: AI service generates appropriate SQL queries against the PostgreSQL loan database
6. 6: Database returns raw loan data which is processed by the AI service
7. 7: AI service transforms technical data into natural language insights
8. 8: Response is streamed back to UI using Server-Sent Events
9. 9: UI displays formatted response to user and maintains chat context for follow-up questions
10. 10: User can continue investigation with additional related queries that build on previous context

## Repos Involved

[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)

## Data Entities

[Loan](../data-model/entities.md), [LoanDetails](../data-model/entities.md), [LoanAction](../data-model/entities.md), [Transfer](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Fee](../data-model/entities.md), [Session](../data-model/entities.md), [Message](../data-model/entities.md), [ChatSession](../data-model/entities.md)

## External Systems

- AWS Bedrock
- CRB Identity Provider
- AWS DynamoDB
- AWS Secrets Manager

## Open Questions

- The specific types of loan queries that are supported vs. unsupported by the AI system
- How data access controls are implemented for different user roles when querying loan data
- The relationship between the AI chat sessions and actual loan operations/actions
- How recent/real-time the loan data is that's available for querying

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-13T06:16:29.479Z*