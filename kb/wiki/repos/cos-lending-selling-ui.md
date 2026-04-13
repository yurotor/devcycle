# COS.Lending.Selling.UI

## Purpose

COS.Lending.Selling.UI is a React-based frontend application for Cross River Bank's loan selling platform. It provides interfaces for loan management, tracking loan history, and facilitating loan transactions between different stakeholders in the lending ecosystem.

## Communicates With

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [cos-lending-selling-ai](../repos/cos-lending-selling-ai.md), [CRB Identity Provider](../repos/crb-identity-provider.md), [CRB Menu Service](../repos/crb-menu-service.md)

## Features Implemented

- [Loan Purchase and Funding](../features/loan-purchase-and-funding.md)
- [Loan Grooming (Investor and Type Changes)](../features/loan-grooming-investor-and-type-changes.md)
- [Loan Inventory Management](../features/loan-inventory-management.md)
- [AI-Powered Loan History Queries](../features/ai-powered-loan-history-queries.md)

## Business Features

- Loan inventory management and tracking
- Loan history and details viewing
- Loan filtering, sorting, and searching
- Pending loan approval workflows
- LTHF (Loans To Be Held For Sale) management
- Chat-based loan history queries

## APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/selling/api/loans/HFS/*` | Retrieve HFS (Held For Sale) loans data |
| POST | `/selling/api/sessions` | Create or retrieve a chat session for loan history queries |
| GET | `/selling/api/sessions/{sessionId}/history` | Retrieve chat history for a loan session |
| GET | `/selling/api/loans/{id}` | Fetch detailed information about a specific loan |

## Dependencies

- **COS.Lending.Selling.API** (http)
- **CRB Identity Provider** (http)
- **CRB AI Service** (http)
- **crb-ui** (shared-lib)

## Data Entities

- **Loan** — Core entity representing a loan in the system with its attributes
- **LoanDetails** — Extended details for a specific loan
- **PendingApproval** — Represents loans awaiting approval in the workflow
- **ChatSession** — Represents a conversation session for querying loan history

> See also: [Data Model](../data-model/entities.md)

## External Integrations

- **CRB Identity Provider** — upstream via REST
- **CRB AI Service** — upstream via REST
- **CRB Menu Service** — upstream via REST

> See also: [Integrations Overview](../integrations/overview.md)

## Architecture Patterns

- Single Page Application (SPA)
- Component-based UI
- RESTful API integration
- Role-based access control
- Server-sent events (for chat)

## Tech Stack

- React
- TypeScript
- Styled Components
- crb-ui (Design System)
- Zustand (State Management)
- Vite
- Cypress
- Docker

## Findings

### [HIGH] Security token exposure in Cypress tests

**Category:** security  
**Files:** cypress/support/utils.ts

Cypress tests are capturing authentication tokens and storing them in localStorage. This practice can expose sensitive tokens in test logs and potentially lead to security breaches. Consider implementing a mock authentication mechanism for tests instead.
### [HIGH] CORS bypass configuration for development

**Category:** security  
**Files:** README.md

The README instructs users to disable CORS in Chrome for development, which is a security risk. A proper development environment should have correctly configured CORS headers. Consider implementing a proper local development proxy.

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-13T06:20:47.564Z*