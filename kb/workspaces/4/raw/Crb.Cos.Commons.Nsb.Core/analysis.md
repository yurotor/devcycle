# Crb.Cos.Commons.Nsb.Core

## Purpose
This repository provides a reusable NServiceBus integration library for .NET applications within the Crb.Cos ecosystem. It offers configuration, extensions, utilities and standardized patterns for implementing NServiceBus messaging.

## Business Features
- Distributed messaging through NServiceBus
- Message tracing and correlation
- Integration with New Relic for monitoring
- Support for interoperability with MassTransit
- Health checks for NServiceBus endpoints
- Standardized logging with Serilog
- Event unsubscription mechanism
- Environment variable configuration for app settings and connection strings

## APIs
- **GET BusExtensions.CrbDefaultConfiguration - Configures standard NServiceBus endpoint** — BusExtensions.CrbDefaultConfiguration - Configures standard NServiceBus endpoint
- **GET CrbHostBuilder.CreateHostBuilder - Creates a standard host for NServiceBus endpoints** — CrbHostBuilder.CreateHostBuilder - Creates a standard host for NServiceBus endpoints
- **GET MessageExtensions - Extensions for sending/publishing messages with headers** — MessageExtensions - Extensions for sending/publishing messages with headers
- **GET HealthCheckBuilderExtensions - Registers NServiceBus health checks** — HealthCheckBuilderExtensions - Registers NServiceBus health checks

## Dependencies
- **NServiceBus for message handling** (shared-lib)
- **Autofac for dependency injection** (shared-lib)
- **Serilog for structured logging** (shared-lib)
- **NewRelic for monitoring** (shared-lib)
- **Microsoft.Extensions.Hosting for host integration** (shared-lib)
- **Microsoft.Extensions.DependencyInjection for DI** (shared-lib)
- **System.Configuration for configuration management** (shared-lib)
- **System.Text.Json for JSON handling** (shared-lib)

## Data Entities
- **Message Headers (UserId, RequestId, TraceId, etc.)** — 
- **NServiceBus Endpoint Configuration** — 
- **LoggingConfig** — 
- **Environment Variables** — 

## External Integrations
- **RabbitMQ (transport)** — bidirectional via unknown
- **New Relic (monitoring/tracing)** — bidirectional via unknown
- **MassTransit (interoperability)** — bidirectional via unknown
- **OpenTelemetry (trace format compatibility)** — bidirectional via unknown

## Tech Stack

## Findings
### [HIGH] The library uses a custom trace ID format compatible with OpenTelemetry but implemented manually rather than using the OpenTelemetry SDK

**Category:** architecture  
**Files:** N/A

The library uses a custom trace ID format compatible with OpenTelemetry but implemented manually rather than using the OpenTelemetry SDK
### [HIGH] The repository contains configuration for interfacing with both MassTransit and NServiceBus messaging systems, suggesting a migration or interoperability scenario

**Category:** architecture  
**Files:** N/A

The repository contains configuration for interfacing with both MassTransit and NServiceBus messaging systems, suggesting a migration or interoperability scenario
### [HIGH] Uses GuidComb for message IDs (presumably for chronological ordering while maintaining uniqueness)

**Category:** architecture  
**Files:** N/A

Uses GuidComb for message IDs (presumably for chronological ordering while maintaining uniqueness)
