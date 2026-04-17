# cos-ecs-autoscaler

## Purpose
AWS ECS autoscaling service for RabbitMQ queues

## Business Features
- Automatic scaling of ECS services based on RabbitMQ queue metrics
- Support for scheduled scaling based on time of day and day of week
- Configurable minimum and maximum instance counts
- Monitoring of queue message rates and backlogs

## Dependencies
- **AWS ECS** (External Service)
- **AWS DynamoDB** (External Service)
- **RabbitMQ Management API** (External Service)
- **Crb.Cos.Commons.Nsb.Host** (Internal NuGet Package)

## Data Entities
- **ScaledObject** — Configuration for scaling a specific service/queue
- **Queue** — RabbitMQ queue metrics
- **ScheduledScaling** — Time-based scaling configuration

## External Integrations
- **RabbitClient** — bidirectional via unknown
- **ECSClient** — bidirectional via unknown
- **DynamoDBClient** — bidirectional via unknown

## Tech Stack
