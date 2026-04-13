# Loan Query & Insights

The Loan Query & Insights flow enables users to interact with an AI-powered system to obtain detailed information about loans through natural language queries. Users submit questions through the COS Lending Selling UI, which are processed by the AI backend service that connects to loan databases to extract relevant information. The system analyzes loan history, interest calculations, transfers, and fees, returning detailed insights formatted for user consumption.

The flow leverages AWS Bedrock LLM APIs to interpret user questions, generate appropriate SQL queries against loan data sources, and provide conversational responses with context retention. The system maintains chat sessions, allowing for follow-up questions while preserving conversation history. Data used for responses is sourced from transformed and processed loan information managed by the data engineering tools, ensuring users receive accurate and current loan insights.

## Steps

1. 1: User initiates a loan query through the COS.Lending.Selling.UI chat interface
2. 2: Query request is sent to cos-lending-selling-ai service via HTTP REST
3. 3: cos-lending-selling-ai service authenticates the request using Identity Server
4. 4: The service processes the natural language query and converts it to structured database queries
5. 5: cos-lending-selling-ai connects to PostgreSQL loan database to retrieve relevant loan data
6. 6: The service uses AWS Bedrock LLMs to analyze the data and generate insights
7. 7: Session and message data is stored in DynamoDB for context retention
8. 8: Insights are returned to the UI through Server-Sent Events for real-time updates
9. 9: User receives formatted response with loan history, interest calculations, transfers, or fee details
10. 10: The conversation history is maintained for follow-up questions

## Repos Involved

[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md), [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md)

## Data Entities

[Loan](../data-model/entities.md), [LoanDetails](../data-model/entities.md), [ChatSession](../data-model/entities.md), [Message](../data-model/entities.md), [LoanAction](../data-model/entities.md), [Transfer](../data-model/entities.md), [InterestHistory](../data-model/entities.md), [Fee](../data-model/entities.md)

## External Systems

- AWS Bedrock
- AWS DynamoDB
- Identity Server
- AWS Secrets Manager
- PostgreSQL loan database

## Open Questions

- The specific data access patterns in cos-lending-selling-ai when retrieving loan history across different loan states
- The synchronization mechanism between cos-lending-selling-datatools ETL processes and the data available for querying in the AI service
- The schema mapping between COS.Lending.Selling.WebApi's loan entities and the structures used by cos-lending-selling-ai

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-13T06:16:29.479Z*