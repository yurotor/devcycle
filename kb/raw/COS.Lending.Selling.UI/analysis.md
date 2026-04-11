# COS.Lending.Selling.UI

## Purpose
COS.Lending.Selling.UI is a React-based web application that provides a front-end interface for managing and monitoring loans within Cross River Bank's lending and selling system. It enables users with different roles to view, filter, sort, and manage loan details, pending approvals, and loan history.

## Business Features
- Loan management dashboard
- Loan details viewing
- Loan filtering and searching
- Loan history tracking and AI-powered queries
- Pending loan approvals management
- Long-term held for sale (LTHFS) loan management
- Role-based access control

## APIs
- **GET /selling/api/loans/HFS** — Retrieve list of loans held for sale
- **GET /selling/api/loans/{id}** — Get detailed information for a specific loan
- **POST /crb/ai/session** — Create or get a chat session for loan history AI analysis
- **GET /crb/ai/session/{sessionId}/history** — Retrieve chat history for a loan session
- **POST /crb/ai/chat/stream** — Stream AI responses for loan history analysis
- **POST /crb/ai/session/{sessionId}/message** — Send a message in the loan history chat

## Dependencies
- **COS.Lending.Selling.API** (http)
- **CRB.AI** (http)
- **Identity Provider (idptest.crbcos.com)** (http)
- **CosLendingMenu** (http)

## Data Entities
- **Loan** — Represents a loan in the system with its details like loan number, status, and sale information
- **LoanHistory** — History of interactions and changes related to a specific loan
- **PendingApproval** — Represents a loan waiting for approval in the system
- **LTHFS** — Long-term held for sale loans that have specific handling requirements

## Messaging Patterns
- **Server-Sent Events** (event) — Used for streaming AI responses in the loan history chat feature

## External Integrations
- **Identity Provider** — upstream via OAuth
- **CosLendingMenu** — bidirectional via Web Components
- **New Relic** — downstream via HTTP
- **TestRail** — downstream via HTTP

## Architecture Patterns
- Single Page Application
- Component-based architecture
- Store pattern (Zustand)
- Role-based access control
- Environment configuration

## Tech Stack
- React
- TypeScript
- Vite
- Styled Components
- Zustand
- crb-ui (internal UI library)
- Cypress
- ReactMarkdown
- OAuth/OIDC
- Server-Sent Events
- Docker
- Nginx

## Findings
### [HIGH] Hardcoded credentials in configuration files

**Category:** security  
**Files:** public/assets/app-settings-dev.js, public/assets/app-settings-qa.js, public/assets/app-settings-stg.js, public/assets/app-settings-prd.js

The configuration files contain placeholders for New Relic credentials. While these appear to be dummy values ('111'), any hardcoded credentials in source code pose a security risk. These should be moved to secure environment variables or secrets management.
### [HIGH] OAuth client credentials potentially exposed

**Category:** security  
**Files:** public/assets/app-settings.js, public/assets/app-settings-dev.js, public/assets/app-settings-qa.js, public/assets/app-settings-stg.js, public/assets/app-settings-prd.js

The application contains OAuth client ID and redirect URIs in public configuration files. While client IDs are typically not sensitive alone, they should ideally be managed through a more secure configuration mechanism to prevent information disclosure.
### [HIGH] CORS issues requiring extension workaround

**Category:** architecture  
**Files:** README.md

The README mentions using a Chrome extension to disable CORS, which is a serious architectural flaw. This approach is highly insecure for development and could lead to security vulnerabilities if the habit carries to production. The application should properly handle CORS through server configuration.
