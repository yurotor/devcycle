# Crb.Cos.Commons.Logging

## Purpose
A .NET logging library distributed as a NuGet package that provides common logging functionality for CRB (Credit Bureau) Cost Optimization System applications

## Business Features
- Standardized logging configuration with Serilog
- Log level management through configuration
- Log enrichment with endpoint name, machine name, thread ID, and unique log IDs
- JSON-formatted console logging
- Log filtering based on source and log levels
- Optional file-based logging with size limits and rolling intervals
- Configuration loading from environment variables

## Dependencies
- **Serilog for structured logging** (shared-lib)
- **Crb.Cos.Commons.Guids (referenced for GuidComb.Generate())** (shared-lib)
- **System.Configuration for configuration management** (shared-lib)

## Tech Stack
