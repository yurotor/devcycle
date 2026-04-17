# cos-lending-selling-e2e-tests

## Purpose



## Communicates With

[COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md), [Mock COS Simulator](../repos/mock-cos-simulator.md), [RabbitMQ](../repos/rabbitmq.md), [PostgreSQL Test Database](../repos/postgresql-test-database.md), [MSSQL Test Database](../repos/mssql-test-database.md), [AWS S3](../repos/aws-s3.md)

## Data Entities

- **Loan** — Represents a loan with attributes like loan_id, mpl_id, issuing_bank_id, loan_type, status, amount, interest_rate
- **Contract** — Defines terms between MPL and bank including fee structure, accrual method, and interest calculation
- **Batch** — Groups loans being purchased together with status tracking
- **Transfer** — Financial transaction between accounts with types for interest, principal, volume fees, etc.
- **LoanAccount** — Represents accounting accounts associated with loans (interest, principal, fees, etc.)

> See also: [Data Model](../data-model/entities.md)

## Architecture Patterns

- Docker containerized microservices architecture
- Event-driven architecture using RabbitMQ for hooks/notifications
- Simulated time travel for testing temporal workflows
- Mock services to simulate external dependencies
- Modular test components with assertions organized by business domain

## Tech Stack


---

> See also: [System Overview](../architecture/system-overview.md) | [Service Map](../architecture/service-map.md)

*Generated: 2026-04-16T13:01:33.726Z*