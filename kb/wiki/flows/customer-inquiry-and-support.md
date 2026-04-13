# Customer Inquiry and Support

The Customer Inquiry and Support flow enables users to inquire about loan data, history, and details through natural language queries. Users interact with the lending platform UI to submit questions about loans, their history, interest calculations, transfers, and fees. The system leverages an AI service to process these inquiries, retrieve relevant loan information from databases, and return comprehensive answers to the user through a conversational interface. This flow maintains context across interactions, allowing for follow-up questions and deeper exploration of loan data.

## Steps

1. 1: User authenticates in COS.Lending.Selling.UI and accesses the loan inquiry interface
2. 2: User submits a natural language question about loans or their history
3. 3: Request is sent to cos-lending-selling-ai service for processing
4. 4: AI service connects to PostgreSQL database to retrieve relevant loan data
5. 5: AI service processes question using AWS Bedrock LLM and generates a response
6. 6: Response is returned to UI via Server-Sent Events maintaining chat context
7. 7: UI displays the response to the user with relevant loan data visualizations
8. 8: User can ask follow-up questions which maintain context from previous inquiries

## Repos Involved

[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)

## Data Entities

[Loan](../data-model/entities.md), [LoanDetails](../data-model/entities.md), [ChatSession](../data-model/entities.md), [Message](../data-model/entities.md), [LoanAction](../data-model/entities.md), [Transfer](../data-model/entities.md), [Session](../data-model/entities.md)

## External Systems

- CRB Identity Provider
- AWS Bedrock
- PostgreSQL loan database
- AWS DynamoDB
- AWS Secrets Manager

## Open Questions

- cos-lending-selling-ai: The exact loan data structure in PostgreSQL that's queried for customer inquiries is not fully defined

---

> See also: [System Overview](../architecture/system-overview.md) | [Data Model](../data-model/entities.md)

*Generated: 2026-04-13T06:16:29.479Z*