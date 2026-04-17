# cos-lending-selling-e2e-tests

## Purpose


## Data Entities
- **Loan** — Represents a loan with attributes like loan_id, mpl_id, issuing_bank_id, loan_type, status, amount, interest_rate
- **Contract** — Defines terms between MPL and bank including fee structure, accrual method, and interest calculation
- **Batch** — Groups loans being purchased together with status tracking
- **Transfer** — Financial transaction between accounts with types for interest, principal, volume fees, etc.
- **LoanAccount** — Represents accounting accounts associated with loans (interest, principal, fees, etc.)

## Architecture Patterns
- Docker containerized microservices architecture
- Event-driven architecture using RabbitMQ for hooks/notifications
- Simulated time travel for testing temporal workflows
- Mock services to simulate external dependencies
- Modular test components with assertions organized by business domain

## Tech Stack
