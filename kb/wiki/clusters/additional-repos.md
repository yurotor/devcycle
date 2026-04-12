# Additional repos

## Shared Entities

- **Loan** — Core entity representing loans in the selling platform, displayed and managed through the UI ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md))
- **ChatSession** — Represents conversation sessions for querying loan history within the UI ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md))

## Data Flows

### Loan Selling Workflow

Process for displaying, managing and selling loans through the UI

  1. Fetch loans from backend API
  2. Display loan information in UI
  3. Allow user to interact with loan data
  4. Submit loan actions through API calls
### Loan History Query Flow

Process for retrieving and displaying loan history through chat sessions

  1. Create/retrieve chat session
  2. Submit history queries
  3. Display chat history results

## Integration Points

- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** → **[COS.Lending.Selling.API](../repos/cos-lending-selling-api.md)** via HTTP: UI retrieves loan data and submits actions to the backend API
- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** → **[CRB Identity Provider](../repos/crb-identity-provider.md)** via HTTP: Authentication and authorization for UI access
- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** → **[CRB AI Service](../repos/crb-ai-service.md)** via HTTP: Likely supports intelligent features within the loan history chat functionality
- **[COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md)** → **[CRB Menu Service](../repos/crb-menu-service.md)** via HTTP: Retrieves navigation menu structure for the UI

## Patterns

- **Frontend Microservice** — React-based UI that integrates with multiple backend services through REST APIs ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md))
- **Conversational Interface** — Chat-based interaction model for querying loan history data ([COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md))

## Open Questions

- Limited context with only one repo in the cluster makes it difficult to analyze true inter-repo relationships
- The exact relationship and data flow between COS.Lending.Selling.UI and COS.Lending.Selling.API is unclear
- The nature of the shared UI library 'crb-ui' and its components is undefined
- How the AI Service specifically enhances the loan selling process remains unclear

---

> See also: [System Overview](../architecture/system-overview.md)

*Generated: 2026-04-12T12:35:48.599Z*