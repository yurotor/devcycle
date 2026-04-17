# Loan Query and Analytics

The Loan Query and Analytics flow enables users to retrieve and analyze loan information through natural language queries. It starts with a user submitting questions about loans via the COS.Lending.Selling.UI interface. These queries are processed by the cos-lending-selling-ai service, which leverages AWS Bedrock LLMs to interpret the natural language, generate appropriate SQL queries against the loan database, and return comprehensive insights about loan history, interest calculations, transfers, and fees.

Results are delivered back to the user interface where they are presented in a conversational format, maintaining context throughout the session. The underlying data is sourced from the PostgreSQL database defined in Cos.Lending.Selling.DbModel, while additional analytics capabilities are supported by cos-lending-selling-datatools, which provides ETL processes and reporting functions for deeper analysis of loan portfolios, contracts, and financial performance metrics.

## Steps

1. 1: User accesses the loan management interface in COS.Lending.Selling.UI and initiates a natural language query about loan information
2. 2: The UI sends the query to cos-lending-selling-ai service along with any relevant context from the current session
3. 3: The AI service processes the natural language query using AWS Bedrock LLM capabilities
4. 4: The AI service translates the query into SQL and executes it against the PostgreSQL database containing loan data from Cos.Lending.Selling.DbModel
5. 5: Query results are processed by the AI service to generate human-readable insights and explanations
6. 6: Results are sent back to the UI via Server-Sent Events, maintaining the conversation context
7. 7: For more complex analytics needs, data from cos-lending-selling-datatools ETL processes may be incorporated into responses
8. 8: The UI displays results to the user in a conversational chat interface, allowing for follow-up questions

## Repos Involved

[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [cos-lending-selling-datatools](../repos/cos-lending-selling-datatools.md)

## Data Entities

[Loan](../data-model/entities.md), [LoanDetails](../data-model/entities.md), [ChatSession](../data-model/entities.md), [Message](../data-model/entities.md), [LoanAction](../data-model/entities.md), [Transfer](../data-model/entities.md), [Interest](../data-model/entities.md), [Fee](../data-model/entities.md), [Contract](../data-model/entities.md)

## External Systems

- AWS Bedrock
- AWS DynamoDB
- AWS S3
- CRB Identity Provider
- CRB AI Service

## Open Questions

- The relationship between loans and LTHFs (Loans To Be Held For Sale) in COS.Lending.Selling.UI is not clearly defined
- The exact mechanism for tenant filtering in Cos.Lending.Selling.DbModel queries is not clear for analytics purposes

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-16T12:55:41.325Z*