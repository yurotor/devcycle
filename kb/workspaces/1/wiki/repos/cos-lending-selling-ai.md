# cos-lending-selling-ai

## Purpose

This repository provides an AI-powered question-answering system for the CRB Lending/Selling platform, enabling natural language queries about loans, their history, interest calculations, transfers, and fees. It functions as a backend service that connects to a database containing loan information and uses Amazon Bedrock LLM APIs to process questions and generate insights.

## Communicates With

[Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md), [AWS Bedrock](../repos/aws-bedrock.md), [AWS DynamoDB](../repos/aws-dynamodb.md), [OAuth Identity Provider](../repos/oauth-identity-provider.md), [AWS Secrets Manager](../repos/aws-secrets-manager.md)

## Features Implemented

- [AI-Powered Loan History Chat](../features/ai-powered-loan-history-chat.md)

## Business Features

- Natural language querying of loan data
- Loan history timeline generation
- Interest calculation and breakdown analysis
- Transfer history tracking
- Fee details and configuration retrieval
- Conversational chat interface with context retention
- SQL generation for custom queries

## APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/crb/ai/loan` | Submit a question about a loan |
| POST | `/chat` | Create or resume a chat session for a user+loan pair |
| POST | `/chat/{session_id}/message` | Submit a user message to a session |
| GET | `/chat/{session_id}/history` | Get all messages for a session |
| GET | `/chat/{session_id}/stream` | Stream chat responses via Server-Sent Events |
| GET | `/health` | Health check endpoint |

## Dependencies

- **PostgreSQL loan database** (database)
- **DynamoDB** (database)
- **AWS Bedrock** (http)
- **Identity Server** (http)

## Data Entities

- **Session** — Represents a chat session between a user and the AI about a specific loan
- **Message** — A message in a chat session from either the user or the assistant
- **Loan** — Core entity representing a loan in the system with its details and status
- **LoanAction** — Represents actions taken on a loan such as transfers or status changes
- **Transfer** — Financial transfers related to loans such as interest payments or fees

> See also: [Data Model](../data-model/entities.md)

## Messaging Patterns

- **Server-Sent Events** (event) — Streams AI responses to the client with progress updates and token-by-token delivery

## External Integrations

- **AWS Bedrock** — outbound via REST
- **AWS DynamoDB** — bidirectional via AWS SDK
- **Identity Server** — outbound via OAuth
- **AWS Secrets Manager** — outbound via AWS SDK

> See also: [Integrations Overview](../integrations/overview.md)

## Architecture Patterns

- API Gateway Pattern
- Streaming Response Pattern
- Chain of Responsibility (for query processing pipeline)
- Repository Pattern
- Dependency Injection
- Singleton Pattern

## Tech Stack

- Python
- FastAPI
- AWS Bedrock
- Amazon Claude (Anthropic)
- DynamoDB
- PostgreSQL
- Docker
- SQLAlchemy/SQLModel
- Poetry
- OAuth/JWT Authentication
- Server-Sent Events (SSE)

## Findings

### [HIGH] Direct SQL execution without parameterization

**Category:** security  
**Files:** app/ai/ai_service.py

The _extract_sql function in ai_service.py uses regex to extract SQL statements and executes them directly. While there are some safeguards in place (SELECT-only check), this approach could be vulnerable to SQL injection if the AI model generates malicious SQL. Consider enhancing the SQL sanitization or using a more structured approach to SQL generation.
### [HIGH] Database credential refresh timing issues

**Category:** architecture  
**Files:** app/ai/sql_executor.py

In sql_executor.py, credential refresh happens outside the thread lock, which could lead to race conditions if multiple threads try to refresh credentials simultaneously. Restructure the credential refresh to happen entirely within the lock to prevent potential issues.
### [HIGH] Limited error handling for Bedrock API failures

**Category:** architecture  
**Files:** app/ai/ai_service.py, app/ai/streaming_summarizer.py

While there is retry logic for Bedrock API calls, the error messages may not provide enough details for debugging in production. Consider implementing more comprehensive error logging and fallback mechanisms when Bedrock is unavailable or experiencing high latency.

---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-16T13:01:33.726Z*