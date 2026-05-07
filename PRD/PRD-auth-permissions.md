# PRD: Permission Management & Auth

## Problem Statement

DevCycle currently has no user authentication or authorization. All API routes are unprotected, there's no concept of user identity, and no way to control who can access which workspaces or perform which operations. As the tool expands to multiple teams, we need identity-based access control with workspace-scoped permissions.

## Solution

Integrate with the existing CRB identity server (OIDC) to authenticate users, then enforce a three-tier role model (Admin / Manager / Engineer) with workspace-scoped permissions. Admins are determined by IDP roles via environment config. Managers and Engineers are assigned to specific workspaces via database records.

## User Stories

1. As an unauthenticated user, I want to be redirected to the identity server login page, so that I can authenticate with my corporate credentials.
2. As an authenticated user, I want my session to silently renew before token expiry, so that I'm not interrupted during work.
3. As an authenticated user with no workspace assignments (and not Admin), I want to see an empty state message, so that I know I need to be added by a workspace Manager.
4. As a user whose IDP roles don't map to Admin and has no DB assignments, I want to be denied access entirely, so that unauthorized users cannot enter the system.
5. As an Admin, I want to create new workspaces, so that I can organize teams.
6. As an Admin, I want to delete workspaces, so that I can clean up unused environments.
7. As an Admin, I want to assign Managers to a workspace, so that those Managers can onboard their teams.
8. As an Admin, I want to remove Managers from a workspace, so that I can revoke access when people change teams.
9. As an Admin, I want to demote a Manager back to Engineer, so that I can correct role assignments.
10. As an Admin, I want to access all workspaces regardless of membership, so that I can oversee the entire system.
11. As a Manager, I want to add Engineers to my workspace by email or username, so that I can onboard my team members.
12. As a Manager, I want to add users who haven't logged in yet (pre-assignment), so that when they first log in they immediately see their workspace.
13. As a Manager, I want to remove Engineers from my workspace, so that I can manage team membership.
14. As a Manager, I want to promote an Engineer to Manager in my workspace, so that I can delegate management responsibilities.
15. As a Manager, I want to configure integrations (Jira, Azure, Elastic, NewRelic) for my workspace, so that my team can use the full feature set.
16. As a Manager, I want to build/rebuild the knowledge base for my workspace, so that my team has up-to-date documentation.
17. As a Manager, I want to manage SDLC compliance (generate design docs, test plans, approve signoffs, configure phase mappings), so that our workspace meets compliance requirements.
18. As a Manager, I want to sync epics from Jira, so that SDLC tracking stays current.
19. As an Engineer, I want to perform the full story lifecycle (analyze, generate PRD, approve PRD, design tasks, implement, review, create PR, monitor pipeline, mark done), so that I can deliver features end-to-end.
20. As an Engineer, I want to view the KB and chat with it, so that I can understand the codebase.
21. As an Engineer, I want to view SDLC dashboards and log insights, so that I can understand project status.
22. As a first-time user, I want my user record created automatically on first login, so that Managers can find and assign me.
23. As a user with multiple IDP roles that map to Admin, I want the highest privilege (Admin) applied, so that my access reflects my actual authority.
24. As an Admin, I want admin status to refresh on every login based on current IDP roles, so that role revocations take effect on next login.
25. As any user, I want API requests rejected with 401 if my token is invalid/expired, so that security is enforced server-side.
26. As any user, I want API requests rejected with 403 if I lack permission for an operation, so that I receive clear feedback.
27. As a Manager, I cannot remove or demote other Managers in my workspace, so that peer conflicts are prevented (only Admin can).

## Implementation Decisions

### Auth Flow
- OIDC Authorization Code + PKCE via `oidc-client-ts` (same pattern as COS.Lending.Selling.UI)
- Access token stored in localStorage
- Bearer token attached to every API request via Authorization header
- Silent renew enabled for seamless token refresh
- No `crb-ui` dependency — native implementation

### Token Validation
- Next.js `middleware.ts` intercepts all API requests
- Backend calls IDP `/connect/introspect` endpoint on every request (same as cos-lending-selling-admin-api)
- Uses client_id + client_secret for introspection auth
- No token caching — introspect every request for consistency
- Invalid/inactive token returns 401 immediately

### Role Resolution
- Admin: determined by IDP role via environment-specific config file (e.g., `policies_prod.json`)
- Multiple IDP roles resolved to highest privilege (Admin > Manager > Engineer; only Admin comes from IDP)
- Manager/Engineer: stored in `workspace_members` table, scoped to specific workspaces
- User with no Admin IDP role AND no workspace membership = empty state (not denied)
- User who authenticates but has no IDP roles matching config AND not in DB at all = empty state on first login (record created)

### User Identity Matching
- Match users by email (strip domain to get username)
- User record created on first login with email, username, name, sub from IDP userinfo
- `isAdmin` flag refreshed on every login based on IDP roles
- Pre-assigned users (added by Manager before first login) matched by email on first login
- 1-hour max window for mid-session admin revocation (acceptable for internal tool; IDP can revoke token if urgent)

### Database Schema

**users table:**
- id (PK)
- email (unique)
- username (email local part)
- name (display name from IDP)
- sub (IDP subject UUID)
- isAdmin (boolean, refreshed on login)
- createdAt
- lastLoginAt

**workspace_members table:**
- id (PK)
- workspaceId (FK to workspaces)
- userId (FK to users)
- role ('manager' | 'engineer')
- assignedBy (FK to users)
- createdAt

### Authorization Enforcement
- `middleware.ts`: global token validation (401 for invalid tokens)
- `requireRole(user, role, workspaceId)` helper: per-route authorization (403 for insufficient permissions)
- Frontend guards: client-side role checks for UX only (hide/show UI elements). Not security — backend enforces.

### Permissions Matrix

| Operation | Admin | Manager | Engineer |
|-----------|-------|---------|----------|
| Create/delete workspace | Y | | |
| App-wide settings | Y | | |
| Assign/remove Manager | Y | | |
| Demote Manager | Y | | |
| Add/remove Engineer (own WS) | Y | Y | |
| Promote Engineer → Manager (own WS) | Y | Y | |
| Configure integrations | Y | Y | |
| Sync tickets/epics from Jira | Y | Y | |
| Build/rebuild KB | Y | Y | |
| SDLC compliance (generate, signoff, config) | Y | Y | |
| Full story lifecycle | Y | Y | Y |
| View KB / chat | Y | Y | Y |
| View dashboards / insights | Y | Y | Y |

### UI Integration
- Admin and Manager user management UI integrated into existing workspace settings (not separate pages)
- Frontend route guards for UX (redirect/hide based on role)

### Environment Config
- Per-environment policy file maps IDP roles to Admin (same pattern as cos-lending-selling-admin-api `policies_{env}.json`)
- Only Admin mapping in config; Manager/Engineer from DB

## Testing Decisions

Good tests verify external behavior (inputs → outputs) without coupling to implementation details. Tests should be resilient to refactoring.

### Modules to test:

1. **Auth Middleware** — test that:
   - Valid token passes through with user identity attached
   - Invalid/expired token returns 401
   - Missing token returns 401
   - Introspection failure (IDP down) returns 401

2. **Role Resolution Service** — test that:
   - User with Admin IDP role resolves to Admin
   - User with multiple IDP roles resolves to highest (Admin)
   - User with workspace membership resolves to correct role per workspace
   - User with no roles and no membership resolves to null (empty state)
   - User who is Manager in WS1 and Engineer in WS2 resolves correctly per workspace

3. **Authorization Helper** — test that:
   - Admin passes all checks regardless of workspace
   - Manager passes Manager-level checks in assigned workspace
   - Manager fails Manager-level checks in non-assigned workspace
   - Engineer passes Engineer-level checks in assigned workspace
   - Engineer fails Manager-level checks
   - Unauthenticated user fails all checks

### Prior art:
- Existing test patterns in `frontend/src/lib/newrelic/client.test.ts`

## Out of Scope

- Multi-factor authentication (handled by IDP)
- Password management (handled by IDP)
- Audit logging (track who did what) — future enhancement
- API key authentication for service-to-service calls
- Rate limiting
- IP allowlisting
- Custom OIDC provider support (locked to CRB identity server)
- User self-service (password reset, profile edit) — IDP handles these
- Refresh token rotation — using silent renew via oidc-client-ts

## Further Notes

- The identity server is at `https://idptest.crbcos.com` (test) with production TBD
- Client ID: `coslendingui` (may need a dedicated client ID for DevCycle in the future)
- Token lifetime: 1 hour
- Scope: `CosLending openid roles`
- IDP returns roles like `"VPN Access"`, `"secDevPTCAPI"` — only specific roles map to Admin per env config
- Pattern closely mirrors cos-lending-selling-admin-api (backend introspection) and COS.Lending.Selling.UI (frontend OIDC flow)
