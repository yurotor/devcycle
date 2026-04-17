# Role-Based Access Control

## Overview
The Role-Based Access Control (RBAC) system provides a comprehensive multi-tenant permission framework that manages application access across different user types. It ensures that users can only access features and data appropriate to their role and organization. The system supports several distinct user types:

- Internal Cross River Bank (CRB) users
- External Marketplace Lender (MPL) agents
- Investor users
- Issuing bank users
- Read-only and agent role variants

This security layer is critical for maintaining data separation between tenants and enforcing appropriate access controls throughout the loan purchase flow.

## How It Works

The RBAC system operates on several key principles:

1. **User Authentication**: Users authenticate through a central identity provider that verifies credentials and establishes identity.

2. **Role Assignment**: Upon successful authentication, the system loads the user's assigned roles from the database.

3. **Permission Mapping**: Each role contains a collection of granular permissions that define allowed actions.

4. **Context-Sensitive Access**: Permissions are evaluated within the context of the specific data being accessed:
   - MPL users can only access loans and contracts from their own marketplace
   - Investor users are restricted to their investment portfolio
   - Issuing bank users see only loans they've issued
   - CRB users have broader access based on their internal role

5. **UI Adaptation**: The user interface dynamically adapts based on the user's permissions, showing only relevant features and actions.

In the Loan Purchase End-to-End Flow, the RBAC system validates permissions at each step to ensure users can only initiate, approve, or view transactions appropriate to their role.

## Repos Involved

The RBAC functionality is implemented across multiple repositories:

- [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md): Implements the frontend permission-based rendering and UI adaptation
- [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md): Contains the authorization middleware and permission verification logic
- [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md): Defines the data structures for users, roles, and permissions

## Key APIs

The RBAC system exposes several key endpoints for permission management:

- `POST /api/auth/validate-permission`: Validates whether a user has a specific permission
- `GET /api/users/roles`: Retrieves roles for the current user
- `GET /api/permissions/by-context`: Gets available permissions for a specific data context
- `POST /api/roles/assign`: Assigns roles to users (admin only)
- `GET /api/roles/available`: Lists available roles for assignment

## Data Entities

The RBAC system uses several key entities from the data model:

- [Account](../data-model/entities.md#account): Contains user identity and profile information
- [Mpl](../data-model/entities.md#mpl): Defines marketplace lender organizations for tenant isolation
- [Investor](../data-model/entities.md#investor): Represents investor organizations with specific access requirements
- [Bank](../data-model/entities.md#bank): Represents issuing banks with their own access patterns
- Role: Defines collections of permissions (not directly linked in provided entities)
- Permission: Defines granular access controls (not directly linked in provided entities)

The permission system integrates with loan-related entities to enforce data isolation between tenants and role-appropriate access control.

---

> **Repos:** [COS.Lending.Selling.UI](../repos/cos-lending-selling-ui.md) | [COS.Lending.Selling.WebApi](../repos/cos-lending-selling-webapi.md) | [Cos.Lending.Selling.DbModel](../repos/cos-lending-selling-dbmodel.md)
> See also: [System Overview](../architecture/system-overview.md) | [Data Flows](../architecture/data-flows.md)

*Generated: 2026-04-16T13:00:42.874Z*