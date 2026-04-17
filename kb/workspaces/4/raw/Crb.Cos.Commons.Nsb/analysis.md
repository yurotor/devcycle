# Crb.Cos.Commons.Nsb

## Purpose
This repository provides a common utility library for NServiceBus implementation in the CRB COS (Corebridge Customer Operations System) platform. It offers standardized configurations, behaviors, extensions, and patterns for using NServiceBus messaging across the COS ecosystem.

## Business Features
- Message routing and endpoint configuration
- Global settings management with database-backed configuration
- Message auditing with configurable filtering
- Database-driven endpoint instance mapping for dynamic routing
- Interoperability with MassTransit messaging
- Standardized logging configuration and enrichment
- Well-known message header propagation and management
- Support for unsubscribing from events when no longer needed
- NewRelic performance monitoring integration

## APIs
- **GET ** — Provides standardized configuration methods for NServiceBus endpoints with CRB-specific defaults
- **GET ** — Provides access to centralized configuration settings stored in database
- **GET ** — Extends NServiceBus message handling with CRB-specific functionality including user context and simplified sending/publishing

## Dependencies
- **NServiceBus** (shared-lib)
- **NHibernate** (shared-lib)
- **RabbitMQ** (shared-lib)
- **Autofac** (shared-lib)
- **Serilog** (shared-lib)
- **NewRelic** (shared-lib)
- **Crb.Cos.Commons** (shared-lib)

## Data Entities
- **GlobalSetting** — 
- **PhysicalEndpointInstance** — 

## Architecture Patterns
- Message-based architecture
- Pipeline behaviors
- Feature-based configuration
- Repository pattern

## Tech Stack
