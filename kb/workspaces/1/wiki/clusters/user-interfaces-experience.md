# User Interfaces & Experience

## Shared Entities

- **Loan** — Core entity representing loan information flowing from AI service to UI for display and interaction ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))
- **ChatSession** — Represents conversation context that persists between UI and AI service, storing question-answer history for loan inquiries ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))
- **Message** — Content exchanged during chat sessions, sent from UI to AI service and returned as responses ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))

## Data Flows

### Loan Query Conversation

End-to-end flow of user asking questions about loans through natural language interface

  1. User selects loan in Selling UI
  2. UI creates a chat session via POST /selling/api/sessions
  3. AI service initializes session context with loan data
  4. User asks question in UI
  5. Question sent to AI service via POST /chat/{session_id}/message
  6. AI service processes using AWS Bedrock
  7. Response streamed back via Server-Sent Events
  8. UI displays response and stores in chat history
### Loan History Retrieval

Flow for accessing historical loan conversations

  1. User requests previous loan conversation
  2. UI fetches session history via GET /selling/api/sessions/{sessionId}/history
  3. AI service retrieves stored conversation from database
  4. Chat history displayed to user in UI

## Integration Points

- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** → **[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)** via HTTP REST: UI sends user questions about loans to AI service and receives detailed loan insights and explanations
- **[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)** → **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** via Server-Sent Events: AI service streams response tokens to UI for progressive rendering of AI responses

## Patterns

- **Progressive Response Rendering** — Uses Server-Sent Events to stream AI-generated content token by token, providing immediate feedback to users rather than waiting for complete responses ([cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md))
- **Natural Language Interface** — Allows users to query complex loan data using natural language rather than structured forms or SQL-like queries ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))
- **Contextual Conversation** — Maintains conversation context across multiple interactions, allowing follow-up questions without restating context ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))

## Open Questions

- The exact relationship between COS.Lending.Selling.API and cos-lending-selling-ai is unclear - whether they're separate services or if one proxies requests to the other
- How loan actions from LoanAction entity in cos-lending-selling-ai are reflected in or initiated from the UI
- The mechanism for synchronizing loan data between PostgreSQL (referenced in cos-lending-selling-ai) and the data source for COS.Lending.Selling.UI

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-16T12:55:41.326Z*