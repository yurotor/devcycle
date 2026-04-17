# cos-container-base-image

## Purpose
This repository provides custom Docker base images for .NET Core applications with Alpine Linux, focusing on optimizing containers for production use with added features like New Relic monitoring.

## Business Features
- Base container images for .NET applications
- New Relic integration for application monitoring
- Support for ICU libraries for proper globalization in .NET
- Optimized container layering for .NET applications

## Dependencies
- **Microsoft .NET runtime** (shared-lib)
- **Microsoft ASP.NET Core runtime** (shared-lib)
- **Alpine Linux** (shared-lib)
- **ICU libraries** (shared-lib)
- **New Relic** (shared-lib)

## External Integrations
- **New Relic** — bidirectional via unknown
- **Azure Pipelines** — bidirectional via unknown

## Tech Stack
