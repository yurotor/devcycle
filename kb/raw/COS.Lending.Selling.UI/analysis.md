# COS.Lending.Selling.UI

## Purpose
COS.Lending.Selling.UI is a frontend application for Cross River Bank's loan selling platform. It provides an interface for managing, viewing, and processing held-for-sale loans across the lending lifecycle, enabling various user roles to interact with loan data, perform approvals, and view loan history.

## Business Features
- Loan inventory management
- Loan details viewing
- Loan filtering and sorting
- Loan history and AI-powered chat interface
- Pending loan approvals workflow
- Long-term held-for-sale (LTHFS) loan management
- Role-based access control
- External organization access (MPL, Investor, Issuing Bank)

## APIs
- **GET /selling/api/loans/HFS** — Retrieve held-for-sale loans with pagination and filtering
- **GET /selling/api/loans/{id}** — Retrieve detailed information about a specific loan
- **POST /crb/ai/chat/session** — Create or retrieve a chat session for loan history analysis
- **GET /crb/ai/chat/session/{sessionId}/history** — Retrieve chat history for a loan session
- **GET /crb/ai/chat/session/{sessionId}/stream** — Stream chat responses for loan history queries

## Dependencies
- **COS.Lending.Selling.API** (http)
- **CRB.AI.API** (http)
- **CRB Identity Provider** (http)
- **CosLendingMenu** (http)

## Data Entities
- **Loan** — Represents a loan that is held for sale
- **LoanDetails** — Extended information about a specific loan
- **PendingApproval** — Loan waiting for approval in the workflow
- **ChatSession** — AI-powered conversation session for loan history analysis

## Messaging Patterns
- **SSE (Server-Sent Events)** (event) — Used for streaming AI responses in the loan history chat interface

## External Integrations
- **CosLendingMenu** — upstream via REST
- **CRB Identity Provider** — upstream via OAuth

## Architecture Patterns
- Single-page application
- Component-based architecture
- OAuth authentication flow
- Server-Sent Events for real-time streaming
- Role-based access control

## Tech Stack
- React
- TypeScript
- Styled Components
- Zustand (state management)
- React Router
- CRB UI component library
- Vite
- Cypress
- Docker
- Nginx

## Findings
### [HIGH] Credentials in configuration files

**Category:** security  
**Files:** cypress/config/cypress.base.config.ts

The Cypress configuration files reference environment variables for authentication which may not be properly secured. Testing credentials should be stored in a secure vault or CI/CD secrets management.
### [HIGH] CORS-related workaround in documentation

**Category:** security  
**Files:** README.md

The README recommends disabling CORS with a Chrome extension for development. This is an insecure practice and should be replaced with proper CORS configuration on the backend services.
