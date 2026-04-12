# User Interface and Experience

## Shared Entities

- **Loan** — Core entity representing loan data with status and attributes, shared across all components ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **Session** — Represents chat sessions between users and AI about specific loans, maintained in AI service but accessed via UI ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))
- **Message** — Chat messages exchanged between users and AI assistant, created in AI service and displayed in UI ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))

## Data Flows

### AI-Assisted Loan Query Flow

User queries loan information through UI, which connects to AI service for natural language processing and returns insights

  1. User submits loan query through UI (/selling/api/sessions)
  2. UI sends request to AI service (/chat or /chat/{session_id}/message)
  3. AI service processes question using AWS Bedrock
  4. AI response streamed back to UI via Server-Sent Events
  5. UI displays response to user
### Loan Status Change Notification Flow

System detects loan status changes and notifies relevant stakeholders

  1. Loan status change detected in system
  2. Hooks service publishes LoanSaleStatusChanged event
  3. Event routed through Hooks Hub to subscribers
  4. UI potentially updates based on notification

## Integration Points

- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** → **[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)** via HTTP REST: UI sends user queries about loans to AI service and receives natural language responses
- **[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)** → **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** via Server-Sent Events: AI service streams processed responses back to UI for progressive rendering
- **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** → **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** via Messaging (indirect): Hooks service publishes events that may trigger UI updates through event subscriptions

## Patterns

- **Natural Language Query** — Enables users to ask questions about loans in natural language instead of using structured search ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))
- **Progressive Loading** — AI responses are streamed token-by-token to improve perceived performance ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))
- **Event-Driven Notifications** — System uses event publishing for real-time notifications about loan status changes ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **Stateful Conversations** — Chat sessions maintain context across multiple interactions for better user experience ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))

## Open Questions

- How COS.Lending.Selling.UI subscribes to or consumes notifications from COS.Lending.Selling.Hooks is not clearly defined
- The mechanism for how COS.Lending.Selling.UI fetches initial loan data before AI queries is unclear
- How loan actions in cos-lending-selling-ai relate to the events published by COS.Lending.Selling.Hooks is undefined
- The relationship between the LoanDetails entity in UI and the LoanAction entity in AI service is not specified

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-12T12:35:48.600Z*