# Crb.Cos.Commons.Messaging

## Purpose
This is a .NET library providing common messaging functionality built on MassTransit to standardize messaging patterns across applications in the CRB ecosystem.

## Business Features
- Message routing with standardized endpoint discovery via IRouteRegistry
- Well-known headers propagation and management (UserId, RequestId, TraceId, etc.)
- NServiceBus interoperability for cross-system messaging
- Message scheduling (one-time and recurring) using Hangfire
- NewRelic observability integration for message monitoring

## Dependencies
- **MassTransit - Primary messaging framework** (shared-lib)
- **RabbitMQ - Underlying message transport** (shared-lib)
- **Hangfire - Message scheduling with PostgreSQL storage** (shared-lib)
- **NewRelic - Observability and metrics** (shared-lib)
- **System.Text.Json - Message serialization** (shared-lib)
- **Crb.Cos.Commons - Core common utilities** (shared-lib)
- **Crb.Cos.Commons.Providers - Well-known header providers** (shared-lib)
- **Crb.Cos.Commons.Guids - GuidComb generation** (shared-lib)
- **Crb.Cos.Commons.Contracts - Contracts and exceptions** (shared-lib)

## Data Entities
- **WellKnownHeaders** — Standard headers passed between services (UserId, RequestId, IdempotencyKey, TraceId, etc.)
- **BackendEndpointOptions** — Configuration for endpoint behavior including retries, concurrency, scheduling
- **SchedulingOptions** — Configuration for Hangfire-based message scheduling

## External Integrations
- **RabbitMQ** — bidirectional via unknown
- **NServiceBus** — bidirectional via unknown
- **NewRelic** — bidirectional via unknown
- **Hangfire/PostgreSQL** — bidirectional via unknown

## Tech Stack
