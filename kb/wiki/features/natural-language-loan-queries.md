# Natural Language Loan Queries

## 1. Overview

The Natural Language Loan Queries feature provides an AI-powered interface for users to ask questions about loans in natural language rather than requiring specialized SQL knowledge or understanding of the underlying data model. This feature enables stakeholders to:

- Query loan history, status, and details through conversational language
- Get insights about interest calculations and accruals
- Track loan transfers and ownership changes
- Access fee information and financial metrics

This feature exists to democratize access to loan data, reduce the learning curve for new team members, and eliminate the need for custom reports for common queries.

## 2. How It Works

The Natural Language Loan Queries feature implements a sophisticated data flow:

1. **User Input**: The user submits a question in natural language through the chat interface in the UI.

2. **Query Processing**: 
   - The frontend sends the query to the backend AI service
   - Claude (via Amazon Bedrock) processes the natural language
   - The system generates appropriate SQL queries based on the question's intent

3. **Data Retrieval**: 
   - The system executes the generated SQL against the loan database
   - Raw data results are fetched from relevant tables

4. **Response Synthesis**:
   - The AI service transforms technical data into a human-readable response
   - Contextual information is added for clarity
   - Previous conversation context is maintained for follow-up questions

5. **Presentation**:
   - The answer is streamed back to the UI for display
   - Chat history is maintained for the session

The system maintains conversation state to support follow-up questions and clarifications, creating a more natural interaction model.

## 3. Repos Involved

- [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md): Backend service that processes natural language, generates SQL, and synthesizes responses
- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): Frontend React application that provides the chat interface and displays responses

## 4. Key APIs

**Backend (cos-lending-selling-ai):**
- `POST /crb/ai/loan`: Process a one-off loan query
- `POST /chat`: Create a new chat session
- `POST /chat/{session_id}/message`: Send a message within an existing session
- `GET /chat/{session_id}/history`: Retrieve chat history
- `GET /chat/{session_id}/stream`: Stream responses for real-time display
- `GET /health`: Service health check endpoint

**Frontend (COS.Lending.Selling.UI):**
- `GET /selling/api/loans/HFS/*`: Retrieve loans held for sale
- `POST /selling/api/sessions`: Create new chat sessions
- `GET /selling/api/sessions/{sessionId}/history`: Fetch chat history
- `GET /selling/api/loans/{id}`: Get specific loan details

## 5. Data Entities

The feature works with several key data entities:

- [Loan](../data-model/entities.md#loan): Core loan entity with attributes and current status
- [LoanAction](../data-model/entities.md#loanaction): Historical actions performed on loans
- [Transfer](../data-model/entities.md#transfer): Records of loan transfers between parties
- [Session](../data-model/entities.md#session): Chat session data
- [Message](../data-model/entities.md#message): Individual messages within a chat
- [LoanDetails](../data-model/entities.md#loandetails): Extended loan information
- [PendingApproval](../data-model/entities.md#pendingapproval): Loans awaiting approval actions
- [ChatSession](../data-model/entities.md#chatsession): Frontend session representation

The system joins these entities as needed to provide comprehensive answers to user queries.

---

> **Repos:** [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-12T14:24:58.973Z*