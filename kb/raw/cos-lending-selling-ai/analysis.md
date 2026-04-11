# cos-lending-selling-ai

## Purpose
This repository implements an AI-powered assistant for loan data analysis in the COS Lending/Selling platform. It uses Amazon Bedrock to provide natural language interactions with structured loan data, enabling users to query loan history, interest calculations, transfers, and other financial details via conversational prompts.

## Business Features
- Loan history timeline visualization and querying
- Interest calculation breakdown and analysis
- Financial transfer history tracking
- Loan details and status reporting
- Fee structure analysis and calculation
- Conversational interface to loan data

## APIs
- **POST /crb/ai/loan** — Submit a natural language question about loan data
- **POST /chat/** — Create or resume a chat session for a user+loan pair
- **POST /chat/{session_id}/message** — Submit a user message to an existing chat session
- **GET /chat/{session_id}/history** — Get all messages for a specific chat session
- **GET /chat/{session_id}/stream** — Stream chat responses using Server-Sent Events (SSE)

## Dependencies
- **identity-server** (http)
- **aws-bedrock** (http)
- **dynamodb** (database)
- **postgres-db** (database)
- **aws-secrets-manager** (http)

## Data Entities
- **Loan** — Core loan information including ID, amounts, dates, and status
- **LoanAction** — Record of actions performed on a loan
- **LoanEvent** — Events in a loan's lifecycle including status changes and purchases
- **Transfer** — Financial transfers related to loans like interest payments and fees
- **InterestCalculationMethod** — Method used to calculate interest for a loan
- **Session** — User conversation session with message history
- **FedDay** — Calendar of federal banking days for interest calculations

## Messaging Patterns
- **SSE Streaming** (event) — Server-sent events for streaming AI responses to clients

## External Integrations
- **Amazon Bedrock** — downstream via REST
- **AWS DynamoDB** — downstream via AWS SDK
- **AWS Secrets Manager** — downstream via AWS SDK
- **Identity Server** — downstream via REST

## Architecture Patterns
- Microservice
- API Gateway
- Event-Driven Architecture
- Natural Language Processing Pipeline
- Serverless (AWS managed services)

## Tech Stack
- Python 3.11
- FastAPI
- Amazon Bedrock
- DynamoDB
- PostgreSQL
- Anthropic Claude LLM
- Docker
- Server-Sent Events
- Poetry
- Pytest
- AWS SDK

## Findings
### [HIGH] SQL Injection Vulnerability

**Category:** security  
**Files:** app/ai/sql_executor.py, app/ai/ai_service.py

Although there is SQL validation logic in sql_executor.py that checks for forbidden keywords and only allows SELECT statements, the application generates SQL from LLM output which could potentially be manipulated. The system should use parameterized queries consistently and add additional validation layers.
### [HIGH] Connection Pool Management Issues

**Category:** architecture  
**Files:** app/ai/sql_executor.py

The SQL executor creates a new connection pool without proper lifecycle management, which could lead to connection leaks. The fallback _SimplePool implementation is particularly problematic as it doesn't properly handle connection closing in all error cases.
### [HIGH] Hardcoded AWS Resource ARNs

**Category:** security  
**Files:** app/ai/sql_executor_old.py

There appear to be hardcoded AWS resource ARNs in the code that should be moved to configuration. This is evident in the sql_executor code where it references DB_CLUSTER_ARN and DB_SECRET_ARN.
### [HIGH] Token Validation Without Proper JWK Verification

**Category:** security  
**Files:** app/core/security/authentication_code_bearer.py

The authentication code doesn't show proper JWT verification against a JWK set from the identity server, which could allow forged tokens if implemented incorrectly. The authentication_code_bearer.py file needs review.
