# Frontend and User Experience

## Shared Entities

- **Loan** — Core entity representing a loan in the system with its attributes, flows from UI to AI service for queries and generates events via Hooks for notifications ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **ChatSession** — Represents a conversation between user and AI about loans, created in UI and managed by AI service ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))

## Data Flows

### Loan History Query Flow

User queries loan history through natural language in UI, gets AI-powered responses

  1. User selects loan and asks question in COS.Lending.Selling.UI
  2. UI creates session via /selling/api/sessions
  3. Request forwarded to cos-lending-selling-ai via /chat or /crb/ai/loan
  4. AI service processes question using AWS Bedrock LLM
  5. Response streamed back to UI via Server-Sent Events
  6. UI displays response to user
### Loan Status Change Notification Flow

System notifies users when loan status changes occur

  1. Loan status change detected in backend system
  2. COS.Lending.Selling.Hooks receives change via /selling/hooks/api/sendNotification
  3. Hook service publishes LoanSaleStatusChanged event
  4. CosLending Hooks Hub distributes notification
  5. UI potentially receives notification and updates display

## Integration Points

- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** → **[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)** via HTTP/REST: UI sends user questions to AI service and receives responses about loan history and details
- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** → **[COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)** via HTTP/Messaging (indirect): UI receives notifications about loan status changes and other events published by the Hooks service
- **[cos-lending-selling-ai](../repos/cos-lending-selling-ai.md)** → **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** via Server-Sent Events: AI service streams responses back to the UI token by token for a responsive chat experience

## Patterns

- **Observer Pattern** — Used to notify interested parties about loan state changes through a hooks system ([COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md))
- **Streaming Response Pattern** — Used to progressively deliver AI responses to improve perceived responsiveness ([cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))
- **Session-based Conversation** — Maintains conversation context across multiple user interactions with the AI ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md))

## Open Questions

- Exact mechanism for how COS.Lending.Selling.UI consumes notifications published by COS.Lending.Selling.Hooks is not defined
- The specific loan attributes that can be queried via the AI service in cos-lending-selling-ai are not fully enumerated
- How the UI in COS.Lending.Selling.UI displays or processes BatchPurchaseCompleted events from COS.Lending.Selling.Hooks is unclear

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-12T12:35:48.599Z*