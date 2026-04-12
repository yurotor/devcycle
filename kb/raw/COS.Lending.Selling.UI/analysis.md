# COS.Lending.Selling.UI

## Purpose
COS.Lending.Selling.UI is a React-based frontend application for Cross River Bank's loan selling platform. It provides interfaces for loan management, tracking loan history, and facilitating loan transactions between different stakeholders in the lending ecosystem.

## Business Features
- Loan inventory management and tracking
- Loan history and details viewing
- Loan filtering, sorting, and searching
- Pending loan approval workflows
- LTHF (Loans To Be Held For Sale) management
- Chat-based loan history queries

## APIs
- **GET /selling/api/loans/HFS/*** — Retrieve HFS (Held For Sale) loans data
- **POST /selling/api/sessions** — Create or retrieve a chat session for loan history queries
- **GET /selling/api/sessions/{sessionId}/history** — Retrieve chat history for a loan session
- **GET /selling/api/loans/{id}** — Fetch detailed information about a specific loan

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

## External Integrations
- **CRB Identity Provider** — upstream via REST
- **CRB AI Service** — upstream via REST
- **CRB Menu Service** — upstream via REST

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
