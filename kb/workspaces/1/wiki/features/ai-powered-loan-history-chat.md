# AI-Powered Loan History Chat

## 1. Overview

The AI-Powered Loan History Chat feature provides a natural language interface that enables users to query loan information using conversational language rather than complex SQL queries or navigating through multiple UI screens. This feature allows users to ask questions about loan details, interest calculations, transfer history, and fee information in plain English.

The feature exists to:
- Reduce the learning curve for new users of the COS Lending Selling platform
- Enable faster access to loan information for customer service representatives
- Allow non-technical users to extract complex loan data without requiring SQL knowledge
- Maintain context across a conversation to support follow-up questions
- Improve overall user efficiency when analyzing loan data

## 2. How It Works

The AI-Powered Loan History Chat implements a conversational interface that:

1. **Receives natural language queries** from users about loan data
2. **Translates these queries** into structured database operations using LLM technology
3. **Executes the appropriate queries** against the loan database
4. **Formats and returns responses** in a conversational, human-readable format
5. **Maintains conversation context** to support follow-up questions

### Data Flow:

1. User submits a natural language question through the UI
2. The request is sent to the backend AI service
3. The AI service:
   - Analyzes the question using Amazon Bedrock LLM
   - Determines the relevant data entities and relationships
   - Generates appropriate SQL queries
   - Executes queries against the database
   - Formats results into natural language responses
4. Response is returned to the user through the UI
5. The conversation history is stored for context retention
6. Follow-up questions can reference previous context

## 3. Repos Involved

- [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) - Core repository that implements the AI query processing, LLM integration, and conversation management
- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) - Implements the chat interface in the frontend
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md) - Provides the database models that the AI service queries against

## 4. Key APIs

### cos-lending-selling-ai APIs:

- `POST /crb/ai/loan` - Processes a one-off loan query without session management
- `POST /chat` - Creates a new chat session
- `POST /chat/{session_id}/message` - Sends a new message in an existing chat session
- `GET /chat/{session_id}/history` - Retrieves conversation history for a session
- `GET /chat/{session_id}/stream` - Streams AI responses for real-time interaction
- `GET /health` - Health check endpoint

## 5. Data Entities

The AI-Powered Loan Chat feature interacts with the following key entities:

- [Session](../data-model/entities.md) - Represents a conversation session with context
- [Message](../data-model/entities.md) - Individual messages within a conversation
- [Loan](../data-model/entities.md) - Core loan information
- [LoanAction](../data-model/entities.md) - Actions performed on loans
- [Transfer](../data-model/entities.md) - Loan transfer history
- [InterestHistory](../data-model/entities.md) - Interest accrual records
- [Fee](../data-model/entities.md) - Fee structures and instances
- [LoanEvent](../data-model/entities.md) - Significant events in a loan's lifecycle
- [Servicing](../data-model/entities.md) - Loan servicing information

The AI system is designed to understand the relationships between these entities and can join relevant tables when generating SQL to answer complex questions that span multiple entity types.

---

> **Repos:** [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md) | [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T12:57:48.813Z*