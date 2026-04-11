# cos-lending-selling-ai

## Purpose
This repository provides an AI-powered question-answering system for the COS Lending Selling platform. It enables users to query loan data through natural language, translating these questions into SQL queries and generating human-readable responses using AWS Bedrock and Claude LLMs.

## Business Features
- Conversational loan data querying
- Natural language to SQL translation
- Loan history analysis
- Transfer history tracking
- Interest breakdown analysis
- Fee details retrieval
- Session-based conversation management

## APIs
- **POST /crb/ai/chat/** — Create or resume a chat session for a user+loan pair
- **GET /crb/ai/chat/{session_id}/history** — Get all messages for a session with validation of ownership
- **POST /crb/ai/chat/{session_id}/message** — Submit a user message to the session
- **GET /crb/ai/chat/{session_id}/stream** — SSE stream endpoint that orchestrates the question-answering pipeline

## Dependencies
- **aws-bedrock** (http)
- **cos-lending-selling-postgres** (database)
- **aws-dynamodb** (database)
- **identity-server** (http)

## Data Entities
- **Session** — User conversation session with session_id, username, loan_id and messages
- **Message** — Chat message with role, content, SQL summary and timestamp
- **Loan** — Core loan entity with loan details, amounts, dates and status
- **LoanAction** — Actions performed on loans such as transfers or status changes
- **Transfer** — Financial transfers related to loans including interest payments and fees

## Messaging Patterns
- **SSE (Server-Sent Events)** (event) — Real-time streaming of AI responses to the client with token-by-token updates

## External Integrations
- **AWS Bedrock** — downstream via REST
- **AWS DynamoDB** — bidirectional via SDK
- **AWS Secrets Manager** — downstream via SDK
- **COS Lending Selling Database** — downstream via PostgreSQL

## Architecture Patterns
- Microservice
- Streaming API
- Chain of Responsibility
- LLM Prompt Engineering
- Repository Pattern
- Singleton Pattern

## Tech Stack
- Python 3.11
- FastAPI
- AWS Bedrock
- Claude LLM
- PostgreSQL
- DynamoDB
- Docker
- Poetry
- SQLModel
- Server-Sent Events
- HTTPX

## Findings
### [HIGH] Potential SQL injection risk in SQL generator

**Category:** security  
**Files:** app/ai/sql_executor.py

The SQL generation functionality using LLM responses could potentially contain SQL injection vulnerabilities. Although there are safeguards like regex checks in _ensure_safe(), the system relies on AI-generated SQL which could produce unexpected results. Implement more robust parameterization and additional validation on generated SQL.
### [HIGH] Session data handling inconsistencies

**Category:** architecture  
**Files:** app/ai/session_manager.py

The session manager uses scan operations to find sessions by ID, which will not scale well. The code mentions this could be a concern as volume grows. Implement a GSI on session_id in DynamoDB to avoid full table scans.
### [HIGH] Credentials caching without proper expiration

**Category:** security  
**Files:** app/ai/sql_executor.py

Database credentials are cached but might not be properly rotated on expiration. The _creds_cache is set to expire after 300 seconds but there's no guarantee that the code properly handles token expiration scenarios. Implement proper credential rotation and expiration handling.
