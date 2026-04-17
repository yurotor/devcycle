# Overdue Loan Alerting

## 1. Overview

The Overdue Loan Alerting feature identifies, tracks, and reports loans that have fallen behind their payment schedules. It provides a systematic approach to monitoring loan delinquency, generating timely notifications to relevant stakeholders, and compiling summary statistics to facilitate portfolio risk management. This feature helps maintain portfolio health by enabling proactive intervention on overdue loans.

Key benefits include:
- Early detection of payment issues
- Standardized reporting for risk management
- Automated notifications to reduce manual monitoring
- Portfolio health metrics for business intelligence

## 2. How It Works

The Overdue Loan Alerting feature operates through the following process flow:

1. **Loan Status Monitoring**:
   - The system regularly scans all active loans against their payment schedules
   - Compares current date against scheduled payment dates accounting for grace periods
   - Flags loans that have missed payment deadlines

2. **Delinquency Classification**:
   - Categorizes overdue loans by severity (e.g., 30, 60, 90+ days past due)
   - Applies business rules for different loan types and investor requirements

3. **Alert Generation**:
   - Produces the `OverdueLoansAlert` entity containing summary statistics
   - Includes counts by delinquency category, portfolio percentages, and trend analysis

4. **Notification Distribution**:
   - Triggers notification events via the hooks service
   - Routes alerts to appropriate stakeholders based on configuration rules
   - Formats data appropriate to the recipient's needs

The feature integrates with the Loan Purchase End-to-End Flow, enabling it to have visibility into all loans in the system regardless of their stage in the lifecycle.

## 3. Repos Involved

The primary repository implementing the Overdue Loan Alerting feature is:

- [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md) - Implements the hooks service that publishes notifications about overdue loans through standardized events

## 4. Key APIs

The feature utilizes the following endpoints in the hooks service:

- `POST /selling/hooks/api/sendNotification` - Endpoint used to distribute overdue loan alerts to configured destinations
- `GET /selling/hooks/health` - Health check endpoint for monitoring the hooks service availability

## 5. Data Entities

The primary data entity related to this feature is:

- [OverdueLoansAlert](../data-model/entities.md) - Contains aggregated data about overdue loans including counts, percentages, and trends by delinquency category

The feature also interacts with loan and payment schedule entities within the broader system, though these aren't directly defined in the repositories provided.

---

**Note for Engineers**: When working with this feature, pay special attention to the configuration of alert thresholds and notification routing rules, as these are customizable per client requirements and may vary across different loan portfolios.

---

> **Repos:** [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [COS.Lending.Selling.Hooks](../repos/cos-lending-selling-hooks.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T13:00:59.712Z*