# COS.Lending.Selling.UI

## Purpose
COS.Lending.Selling.UI is a React-based frontend application for CrossRiver Bank's lending and selling platform. It provides interfaces for loan management, selling, and tracking with various user role-specific features across different environments (development, QA, staging, production).

## Business Features
- Loan management and tracking
- Loan history and details viewing
- Long-term hold for sale (LTHFS) loan management
- Pending loan approvals management
- AI-assisted loan history insights
- Loan searching, filtering and sorting
- Role-based access control

## APIs
- **GET /selling/api/loans/HFS** — Retrieve loans held for sale data
- **GET /selling/api/loans/{id}** — Retrieve details of a specific loan
- **POST /crb/ai/session** — Create or get an AI chat session for loan history analysis
- **GET /crb/ai/session/{sessionId}/history** — Get history of AI chat sessions
- **POST /crb/ai/session/{sessionId}/chat** — Send a message to the AI chat session
- **GET /crb/ai/session/{sessionId}/stream** — Stream AI chat responses for real-time updates

## Dependencies
- **CosLendingSellingApi** (http)
- **crb-ui** (shared-lib)
- **identity-provider** (http)
- **CRB AI Service** (http)
- **CosLendingMenu** (http)

## Data Entities
- **Loan** — Core loan entity with detailed loan information including status, amounts, and dates
- **LoanDetails** — Extended information about a specific loan including sale status and borrower info
- **PendingApproval** — Loan approval requests awaiting management decision
- **ChatSession** — AI conversation session about loan history and data analysis
- **ChatMessage** — Individual message in an AI conversation session with loan data insights

## Messaging Patterns
- **SSE (Server-Sent Events)** (event) — Used for streaming real-time AI chat responses for loan history analysis

## External Integrations
- **Identity Provider** — bidirectional via REST
- **CRB AI Service** — bidirectional via REST
- **COS Lending Menu** — downstream via web-component

## Architecture Patterns
- Component-based architecture
- REST API client
- Server-Sent Events (SSE)
- Single Page Application (SPA)
- Role-based access control
- Micro frontend

## Tech Stack
- React
- TypeScript
- Styled Components
- Vite
- Cypress
- Zustand
- React Router
- Dayjs
- OAuth/OIDC
- CRB UI component library
- Docker
- Nginx

## Findings
### [HIGH] Disabled CORS in development documentation

**Category:** security  
**Files:** README.md

The README recommends disabling CORS through a browser extension for local development, which could lead to security vulnerabilities if developers forget to re-enable it or become accustomed to working with disabled CORS. A better approach would be to properly configure CORS on the development backend.
### [HIGH] Potential exposure of user credentials in environment variables

**Category:** security  
**Files:** cypress/config/cypress.base.config.ts

User passwords and test credentials appear to be stored in environment variables that might be exposed in CI/CD pipelines or logs. Credentials should be stored in secure credential stores and accessed only during runtime.
### [HIGH] Inconsistent environment configuration approach

**Category:** architecture  
**Files:** public/assets/app-settings-dev.js, public/assets/app-settings.js, cypress/config/cypress.base.config.ts

The application uses multiple environment configuration mechanisms (app-settings-*.js files, .env files, and hardcoded config in code), making it difficult to maintain consistent configuration across environments. A unified configuration approach should be implemented.
