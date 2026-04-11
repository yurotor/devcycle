# cos-lending-selling-ai

## Purpose
The COS Lending Selling AI service provides a conversational AI assistant for loan analysis, allowing users to query loan history, interest calculations, transfers, and other details through natural language. It connects to PostgreSQL databases to execute SQL queries based on user questions and returns summarized responses.

## Business Features
- Loan history timeline analysis
- Interest calculation and breakdown
- Transfer history tracking
- Loan details retrieval
- Fee configuration analysis
- Natural language query processing
- Conversational AI chat interface
- SQL generation from natural language

## APIs
- **POST /crb/ai/loan** — Submit a natural language question about a loan
- **POST /chat/** — Create or resume a chat session for a user+loan pair
- **GET /chat/{session_id}/history** — Get message history for a chat session
- **POST /chat/{session_id}/message** — Submit a user message to a chat session
- **GET /chat/{session_id}/stream** — Stream AI-generated responses as server-sent events

## Dependencies
- **aws-bedrock** (http)
- **lending-selling-database** (database)
- **dynamodb** (database)
- **identity-server** (http)

## Data Entities
- **Loan** — Core loan information including ID, amount, rates, and status
- **LoanAction** — Actions taken on loans like funding or status changes
- **Transfer** — Money movements related to loans including interest payments and fees
- **InterestCalculationMethod** — Methods used to calculate interest for different loan types
- **Session** — Chat conversation session between user and AI about a specific loan

## Messaging Patterns
- **SSE streaming** (event) — Server-Sent Events for streaming AI responses to clients

## External Integrations
- **AWS Bedrock** — downstream via REST
- **AWS DynamoDB** — downstream via AWS SDK
- **AWS Secrets Manager** — downstream via AWS SDK
- **Identity Server** — upstream via OAuth2

## Architecture Patterns
- Microservice
- Event-driven
- API Gateway
- OAuth2 Authentication
- LLM-based Query Understanding
- Session Management

## Tech Stack
- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- AWS Bedrock
- AWS DynamoDB
- AWS Secrets Manager
- Claude 3 Sonnet (Anthropic)
- Docker

## Findings
### [HIGH] Insecure token validation in streaming endpoint

**Category:** security  
**Files:** app/api/routes/chat_stream.py

The chat streaming endpoint validates session ownership but doesn't appear to verify token expiration. An expired token could potentially continue accessing streams if the session ID is known.
### [HIGH] Lack of rate limiting for AI service

**Category:** architecture  
**Files:** app/ai/ai_service.py

The application doesn't implement rate limiting for AI calls, which could lead to excessive costs and potential abuse. Consider adding a rate limiter for API calls to Bedrock.
### [HIGH] Potential SQL injection vulnerability

**Category:** security  
**Files:** app/ai/sql_executor.py

While the application attempts to validate SQL safety with regex patterns, the _apply_required_predicates function in sql_executor.py may be vulnerable to SQL injection as it directly interpolates values into queries.
