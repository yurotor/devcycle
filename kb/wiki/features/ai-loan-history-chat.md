# AI Loan History Chat

## Overview

The AI Loan History Chat feature provides a natural language interface for querying loan history, interest accruals, and fees without requiring knowledge of specific database structures or SQL queries. This feature enables users to ask questions about loans in plain English and receive accurate, contextually relevant responses based on actual loan data.

This feature exists to:
- Simplify access to complex loan information for bank staff and partners
- Reduce training time for new team members
- Enable rapid insights without technical database knowledge
- Provide consistent, accurate information about loan histories

## How It Works

The AI Loan History Chat implements a conversational interface that leverages AWS Bedrock LLM to process natural language questions and convert them into appropriate database queries.

**Data Flow:**

1. **Query Initiation**: User enters a natural language question in the UI (e.g., "What were the fees collected for loan ABC123 in August?")

2. **Session Management**: The UI creates a new chat session (or resumes an existing one) and sends the query to the backend AI service

3. **Language Processing**: The AWS Bedrock LLM processes the question to understand the intent and identify required data points

4. **Query Generation**: The AI service dynamically constructs appropriate SQL queries based on the interpreted question

5. **Data Retrieval**: The system executes the SQL against the loan database to retrieve relevant loan history, interest data, or fee information

6. **Response Formatting**: Results are transformed into natural language responses that directly answer the user's question

7. **Streaming Delivery**: The response is streamed to the frontend using Server-Sent Events (SSE), providing a real-time conversation experience

8. **History Persistence**: The conversation history is stored in DynamoDB for context retention and future reference

## Repos Involved

- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): Contains the React-based chat interface, session management, and SSE client implementation
  
- [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md): Implements the AI service backend, language processing, SQL generation, and response formatting
  
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Provides the database models and context that the AI service queries against

## Key APIs

### Frontend (COS.Lending.Selling.UI)

- `POST /selling/api/sessions`: Create a new chat session
- `GET /selling/api/sessions/{sessionId}/history`: Retrieve conversation history
- `GET /selling/api/loans/{id}`: Get loan details for context enrichment

### AI Service (cos-lending-selling-ai)

- `POST /chat`: Initialize a new chat session
- `POST /chat/{session_id}/message`: Send a message to an existing session
- `GET /chat/{session_id}/stream`: Establish SSE connection for streaming responses
- `GET /chat/{session_id}/history`: Get message history for a session
- `POST /crb/ai/loan`: Direct loan query endpoint for specific loan inquiries

## Data Entities

The feature interacts with multiple data entities across the system:

- [Loan](../data-model/entities.md#loan): Core loan information including balance, status, and terms
- [LoanEvent](../data-model/entities.md#loanevent): Historical events and actions performed on loans
- [Fee](../data-model/entities.md#fee): Fee applications, collections, and adjustments
- [Transfer](../data-model/entities.md#transfer): Loan transfers between parties
- [InterestHistory](../data-model/entities.md#interesthistory): Records of interest accruals and payments
- [ChatSession](../data-model/entities.md#chatsession): Session metadata and context
- [Message](../data-model/entities.md#message): Individual messages within a chat session

This AI-driven interface significantly improves the user experience when exploring complex loan histories, enabling users to quickly obtain accurate information without specialized database knowledge.

---

> **Repos:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T12:37:11.827Z*