# ADR-001: User-Scoped Route Refactor — `/user/:userId/...`

**Status:** Accepted  
**Date:** 2026-05-13  
**Authors:** architect-agent

---

## Context

All user-section backend routes are currently flat under `/protected/user/...`. There is no user identifier in the URL, so the backend silently scopes all queries to `req.user.id` from the JWT. The frontend has no auth context — `UserLayout.tsx` uses hardcoded static nav paths and the user identity ("Alex Harrison") is a placeholder. The ask is to move to `/user/:userId/...` across backend and frontend.

---

## Decision

### 1. Approach: Option A — Security Check Only

Reject option B (admin gateway). Reasons:

- The existing controllers already use `req.user.id` from the JWT for all data scoping (see `userDashboard`, `listDocumentsFromTenant` at lines 1151–1210 of `protectedController.ts`). Introducing admin-level cross-user access via the same routes would require forking every controller method and adds substantial audit surface area with no stated product requirement.
- The multi-tenant model uses `req.user.organizationId` to select the database; a userId in the URL adds nothing to data isolation.
- Option A is one middleware line per route group and zero controller changes.

The `:userId` segment serves as a **client-side routing anchor** (so the URL reflects who is logged in) and a **backend integrity check** (reject mismatched requests with 403 immediately).

---

### 2. Backend — New Route Signatures

File: `backend/src/routes/protectedRoutes.ts`

Replace all `/user/` route registrations (lines 25–35) with:

```
GET    /protected/user/:userId
GET    /protected/user/:userId/dashboard
GET    /protected/user/:userId/categories
GET    /protected/user/:userId/search
POST   /protected/user/:userId/documents/single
POST   /protected/user/:userId/documents/bulk
GET    /protected/user/:userId/documents
GET    /protected/user/:userId/documents/:id
PATCH  /protected/user/:userId/documents/:id/archive
PATCH  /protected/user/:userId/documents/:id/metadata
DELETE /protected/user/:userId/documents/:id
```

Insert a dedicated `validateOwnUserId` middleware before the existing `requireAuth` on each user route:

```ts
// middleware/userScopeMiddleware.ts
export const validateOwnUserId = (req: Request, res: Response, next: NextFunction) => {
  if (req.params.userId !== req.user?.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  return next();
};
```

Middleware order per route: `requireAuth, validateOwnUserId, requireRole(...)`.  
No controller code changes needed.

---

### 3. Frontend — Folder Rename Strategy

Current: `frontend/app/user/[page]/`  
Target:  `frontend/app/user/[userId]/[page]/`

Affected folders (all under `frontend/app/user/`):
- `dashboard/`
- `documents/` (including `archived/` and modal files)
- `upload-documents/` (including `BulkUpload/`, `SingleUpload/`)
- `categories/`
- `search/`
- `advanced-search/`
- `settings/` (including `profile/`, `notifications/`)

`frontend/app/user/layout.tsx` moves to `frontend/app/user/[userId]/layout.tsx` — the dynamic segment is captured here once and passed down via `params.userId`.

`frontend/app/user/[userId]/layout.tsx` wraps `UserLayout` and reads `params.userId` to pass into the sidebar for nav path construction.

---

### 4. How the Frontend Gets `userId`

**Chosen mechanism: `/api/me` server-side endpoint (new).**

Rationale: The JWT `access_token` is an `httpOnly` cookie — the browser cannot read it. Decoding it client-side is not possible without exposing the JWT secret. A dedicated endpoint keeps the pattern consistent with the rest of the API.

Add to the backend:

```
GET /api/me   →  returns { id, email, fullName, role, organizationId }
```

On the frontend, call `/api/me` once in the root `user` layout (`frontend/app/user/layout.tsx`, which becomes a server component or uses a one-time client fetch on mount). Store the result in React context via a `UserProvider` wrapping `[userId]/layout.tsx`. The `userId` from the response is then used to:

1. Redirect from `/user` to `/user/{userId}/dashboard` on first load.
2. Build all nav hrefs in `UserLayout.tsx` dynamically from context instead of the hardcoded `navItems` array (lines 9–16 of `UserLayout.tsx`).
3. Prefix every `fetch(...)` call in page components.

---

### 5. Migration Risk — Hardcoded URLs That Break

Grep result: 14 call sites across 6 files all use the pattern `${API_BASE_URL}/protected/user/...`:

| File | Occurrences |
|------|-------------|
| `app/user/documents/page.tsx` | 6 |
| `app/user/documents/archived/page.tsx` | 3 |
| `app/user/advanced-search/page.tsx` | 2 |
| `app/user/categories/page.tsx` | 1 |
| `app/user/dashboard/page.tsx` | 1 |
| `app/user/search/page.tsx` | 1 |

Additionally, `documents/page.tsx` line 229 has a hardcoded `href="/user/documents/archived"` Link that must become `/user/${userId}/documents/archived`.

The `navItems` array in `UserLayout.tsx` lines 9–16 contains 6 hardcoded paths; all break on folder rename.

No cross-service consumers of the `/protected/user/` routes were found.

---

### 6. Phased Implementation Order

**Phase 1 — Backend (non-breaking, additive)**
1. Add `GET /api/me` endpoint (new file `backend/src/routes/meRoute.ts`).
2. Add `validateOwnUserId` middleware (`backend/src/middlewares/userScopeMiddleware.ts`).
3. Register new `/user/:userId/...` routes in `protectedRoutes.ts` alongside the existing `/user/...` routes (dual-register). Do not remove old routes yet.
4. Deploy and smoke test. Old frontend continues to work.

**Phase 2 — Frontend**
1. Add `UserProvider` context (new file `frontend/app/components/providers/UserProvider.tsx`) that fetches `/api/me` and exposes `userId`.
2. Rename `frontend/app/user/` page folders into `frontend/app/user/[userId]/`.
3. Update `UserLayout.tsx` `navItems` to use `userId` from context.
4. Update all 14 `fetch(...)` call sites to inject `userId` from context.
5. Update the hardcoded `href` on `documents/page.tsx` line 229.
6. Add redirect: `frontend/app/user/page.tsx` → redirects to `/user/{userId}/dashboard`.

**Phase 3 — Cleanup**
1. Remove the old `/user/...` routes from `protectedRoutes.ts`.
2. Delete the original (non-dynamic) folder structure.

---

## Consequences

- Zero controller logic changes.
- One new middleware file, one new route file.
- 14 frontend fetch call sites require `userId` injection — mechanical but must be done in one coordinated commit to avoid broken states.
- The `UserLayout` sidebar currently shows a hardcoded "Alex Harrison" stub (line 101); this must be replaced with real data from `UserProvider` as part of Phase 2.
- `userDashboard` controller already filters by `req.user.id`; once Phase 3 removes old routes, users cannot accidentally hit another user's data via URL manipulation.

---

## Handoff

- **backend-fastapi** (Express in this project): implement Phase 1 — `GET /api/me`, `validateOwnUserId` middleware, dual-registered routes.
- **frontend-react**: implement Phase 2 — `UserProvider`, folder rename, nav and fetch call site updates.
- **security**: review `validateOwnUserId` middleware implementation before Phase 3 cutover.
