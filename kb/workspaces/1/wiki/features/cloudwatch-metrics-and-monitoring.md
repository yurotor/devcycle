# CloudWatch Metrics and Monitoring

## Overview

The CloudWatch Metrics and Monitoring feature provides comprehensive operational visibility into the COS Lending Selling platform by generating and tracking key business and technical metrics. This feature enables real-time monitoring of critical system operations including loan processing volumes, transfer activities, interest accruals, and fee collections.

The primary goals of this feature are to:

- Provide real-time operational visibility through custom CloudWatch dashboards
- Enable proactive alerting on system anomalies or business thresholds
- Support capacity planning and business reporting with historical metric data
- Facilitate troubleshooting of system issues through correlation of metrics

## How It Works

The CloudWatch Metrics and Monitoring feature collects metrics from various system components and processes, with particular emphasis on the Interest Accrual Daily Process. The system publishes custom metrics to Amazon CloudWatch in the following categories:

1. **Loan Processing Metrics**:
   - Loan counts by Marketplace Lender (MPL)
   - Loan counts by loan type
   - Loan counts by status (active, paid off, charged off, etc.)

2. **Transfer Activity Metrics**:
   - Transfer volumes (count and dollar amount)
   - Transfer success/failure rates
   - Transfer processing time

3. **Interest Accrual Metrics**:
   - Daily accrual amounts by calculation method (Standard, SOFR-based, Combined)
   - Processing time for accrual calculations
   - Count of loans processed for interest accrual

4. **Fee Collection Statistics**:
   - Volume fee collections
   - Monthly true-up processing metrics
   - Fee collection success/failure rates

The metrics are collected at various stages of processing through CloudWatch agent integrations and custom metric publications. These metrics are then aggregated into CloudWatch dashboards for visualization and used to configure alarms for proactive notification of system issues or business anomalies.

## Repos Involved

- [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) - Contains the code that instruments and publishes metrics during loan data ingestion and processing
- [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md) - Contains the infrastructure definitions for CloudWatch resources including dashboards, alarms, and metrics configurations

## Key APIs

This feature does not expose any APIs directly, as it primarily collects and publishes metrics to AWS CloudWatch. The metrics are consumed through AWS CloudWatch APIs and dashboards.

## Data Entities

- [loan_funding](../data-model/entities.md) - This entity is monitored as part of the transfer volumes and loan processing metrics

The metrics collection is primarily focused on operational data rather than direct entity manipulation, serving as an observability layer over the core business processes of the platform.

---

> **Repos:** [cos-lending-selling-ingestion](../repos/cos-lending-selling-ingestion.md) | [iac-cos-lending-selling](../repos/iac-cos-lending-selling.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T13:00:24.551Z*