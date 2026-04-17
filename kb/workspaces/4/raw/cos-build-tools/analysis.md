# cos-build-tools

## Purpose
A build toolkit repository that provides standardized build processes, pipeline templates, and TypeScript code generation for .NET projects within the Cross River Bank (CRB) ecosystem.

## Business Features
- Automatic TypeScript client generation from C# API contracts
- Database deployment scripts management
- Assembly binding redirect management
- Standardized versioning using GitVersion

## Dependencies
- **Nuke.Common** (shared-lib)
- **NSwag** (shared-lib)
- **NJsonSchema** (shared-lib)
- **Buildalyzer** (shared-lib)
- **Microsoft.CodeAnalysis** (shared-lib)
- **GitVersion** (shared-lib)

## Architecture Patterns
- Shared build tooling
- Code generation
- CI/CD pipeline templates
- Convention over configuration

## Tech Stack
