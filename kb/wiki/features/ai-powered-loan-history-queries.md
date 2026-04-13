# AI-Powered Loan History Queries

## 1. Overview

The AI-Powered Loan History Queries feature provides a natural language interface that enables users to query and analyze loan details, history, interest calculations, transfers, and fees using conversational language instead of complex SQL queries. This feature leverages AWS Bedrock (Claude) to interpret user questions, generate appropriate SQL queries, execute them against the loan database, and provide human-readable explanations of the results.

**Business Value:**
- Democratizes access to loan data by eliminating the need for SQL expertise
- Reduces time spent on custom report creation and data analysis
- Enables faster decision-making through immediate access to insights
- Improves user experience by providing a conversational interface for complex data retrieval

## 2. How It Works

The AI-Powered Loan Query feature follows this data flow:

1. **User Input**: The user submits a natural language question about loan data through the UI.

2. **Session Management**: The UI creates or continues a chat session, sending the question to the backend service.

3. **Query Processing**:
   - The AI service (AWS Bedrock Claude) analyzes the question
   - It generates appropriate SQL based on the database schema
   - It executes the SQL against the loan database
   - It formats the results in a human-readable manner
   - It provides explanations and insights about the data

4. **Response Delivery**: The system returns the formatted results to the UI, which displays them to the user.

5. **Conversation History**: The system maintains the context of previous questions, enabling follow-up questions and a conversational experience.

## 3. Repos Involved

- [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md): Backend service that processes natural language queries, communicates with AWS Bedrock, generates SQL, and formats responses.

- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): Frontend application that provides the user interface for submitting queries and displaying responses.

- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Database model repository that defines the schema and entities that the AI queries against.

## 4. Key APIs

### cos-lending-selling-ai
- `POST /crb/ai/loan`: Processes a one-off loan query
- `POST /chat`: Creates a new chat session
- `POST /chat/{session_id}/message`: Submits a message to an existing chat session
- `GET /chat/{session_id}/history`: Retrieves chat history for a session
- `GET /chat/{session_id}/stream`: Streams responses for real-time updates
- `GET /health`: Health check endpoint

### COS.Lending.Selling.UI
- `POST /selling/api/sessions`: Creates a new AI chat session
- `GET /selling/api/sessions/{sessionId}/history`: Retrieves session history
- `GET /selling/api/loans/{id}`: Gets loan details by ID
- `GET /selling/api/loans/HFS/*`: Retrieves loans held for sale with various filters

## 5. Data Entities

The AI query system can access and analyze the following key entities:

- [Loan](../data-model/entities.md#loan): Core loan data including balances, rates, statuses
- [LoanAction](../data-model/entities.md#loanaction): History of actions performed on loans
- [Transfer](../data-model/entities.md#transfer): Record of loan transfers between entities
- [Fee](../data-model/entities.md#fee): Fee information related to loans
- [InterestHistory](../data-model/entities.md#interesthistory): Historical record of interest calculations
- [LoanEvent](../data-model/entities.md#loanevent): Significant events in a loan's lifecycle
- [Account](../data-model/entities.md#account): Account information related to loans
- [Investor](../data-model/entities.md#investor): Entities that purchase loans
- [Mpl](../data-model/entities.md#mpl): Marketplace lenders who originate loans

The AI system can analyze relationships between these entities to answer complex questions spanning multiple data tables.

---

> **Repos:** [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-13T06:18:53.205Z*