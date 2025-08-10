## Pulse 2 — Root Cause Analysis (RCA)

### Executive summary

- WordPress theme lacks proper header/footer templates, so `wp_head()`/`wp_footer()` are likely not called. This prevents scripts/styles from being printed reliably, causing the app to fail to mount on some pages.
- Authentication is inconsistent. The frontend assumes a JWT flow, while the plugin also offers a local `/pulse2/v1/login` proxy. The current `LoginModal` calls `jwt-auth/v1/token` directly and never tries the proxy. If the JWT plugin is missing/misconfigured, login fails and many endpoints will 401/403.
- API surface is fragmented in the frontend. Several services bypass the centralized `wpApiClient` and manually build headers, leading to duplicated logic and token/nonce drift.
- Multiple frontend endpoints do not exist in the WordPress plugin. Those calls 404 and break features (notably workflow/timeline operations and presence updates).
- Minor endpoint path mismatches in the client (e.g., delete pin), and HTTP verb mismatches (presence update uses POST but backend expects PUT).
- Build assets integration is correct (glob-based), but older docs still instruct manual filename updates, which is confusing.

---

### WordPress-level findings

- Theme deprecations show missing header/footer templates
  - Evidence (from `wordpress/what happend in debug.md`):
    - “File Theme without header.php is deprecated”, “File Theme without footer.php is deprecated”.
  - Impact: Scripts enqueued by the shortcode may not be emitted if `wp_head()`/`wp_footer()` aren’t present, resulting in the React app not loading.
  - Risk: High — prevents the application from mounting.

- Authentication path ambiguity (JWT vs cookie/nonce)
  - The plugin localizes `jwtUrl` and emits a `wp_rest` nonce for cookie-based flows.
  - It also exposes `/pulse2/v1/login` as a safe proxy that tries JWT first and falls back to `wp_authenticate`.
  - The frontend `LoginModal` uses only `jwt-auth/v1/token`. If the JWT plugin (and its keys/CORS) aren’t properly configured, users cannot log in from within the app.
  - Risk: High — leads to hard-to-debug 401/403 on protected endpoints.

- REST endpoints are partly implemented
  - Implemented core: projects, users, invitations, notes, activities, settings, presence (GET/PUT), workspaces, workflow metrics, workflow templates.
  - Implemented JSON storage for whiteboard/moodboard via `/workspaces-json/...` endpoints.
  - Not implemented: many workflow/timeline endpoints that the frontend calls (see matrix below).
  - Risk: Medium — specific features fail silently or show errors.

- Activation/table creation
  - `includes/core/database.php` defines many custom tables, but current logic stores workspace content as JSON meta (CPT) via `workspaces-json.php`.
  - Table creation runs on `init` via `init_workspace_tables()`, which is heavy. It should be moved to activation (and versioned migrations), not on every request.
  - Risk: Low/Medium — performance overhead and maintenance confusion.

---

### Frontend-level findings

- App bootstrap
  - `src/main.tsx` correctly mounts into `#pulse2-root > #root` and falls back to standalone `#root` for dev. This is correct.

- API fragmentation and header drift
  - `src/lib/apiClient.ts` centralizes auth headers, retries, and timeouts.
  - But several services (e.g., `workspaceService`, `activityService`, `notesService`, `useUserManagement`) build fetch calls and headers manually, sometimes with differing header sets (JWT/nonce). This leads to subtle bugs under different auth modes.

- Endpoint/verb mismatches and missing backend routes
  - Presence update:
    - Client: `useUserManagement.updatePresence`: POST `${apiUrl}/presence`
    - Server: `rest-routes.php` exposes PUT, not POST
    - Result: 404/405
  - Delete image pin:
    - Client: `workspaceService.deletePin` -> DELETE `/workspace-pins/{pinId}`
    - Server: Only `/workspaces-json/pins/{pinId}` (PUT) exists; there is no delete route
    - Result: 404
  - Workflow/timeline endpoints (client expects, server missing):
    - `PUT /workflow-stages/{stageId}` (update)
    - `POST /workflow-stages/{stageId}/complete`
    - `DELETE /workflow-stages/{stageId}`
    - `GET/POST /workflow-stages/{stageId}/checklist`
    - `PUT/DELETE /workflow-checklist/{itemId}`
    - `GET/POST /workflow-approvals` and `PUT /workflow-approvals/{approvalId}`
    - `POST/DELETE /workspaces/{workspaceId}/stage-dependencies`
    - `PUT /workflow-stages/bulk-update`
    - `POST /workflow-stages/bulk-assign`
    - `POST /workflow-templates/{templateId}/create-workflow`
    - `GET /workspaces/{workspaceId}/timeline-tasks`, `POST /workspaces/{workspaceId}/timeline-tasks`, `PUT /timeline-tasks/{taskId}`, `DELETE /timeline-tasks/{taskId}`
    - `GET /workspaces/{workspaceId}/milestones`, `POST /workspaces/{workspaceId}/milestones`
    - `GET /timeline-dependencies`, `POST /timeline-dependencies`
    - `POST /workflow-stages/{stageId}/validate-transition`
    - `GET /workspaces/{workspaceId}/dependency-cycles`
    - Result: Any UI path calling these will fail.

- Media upload
  - Client uploads to `wp/v2/media` using Bearer. Depending on the JWT plugin, WordPress core media endpoint may still require cookie/nonce auth. The safer path is to prefer the plugin’s own `/workspaces-json/{workspaceId}/images` for uploads or ensure JWT enables `wp/v2` auth.

- Docs/process confusion
  - `How to compile.txt` describes manually wiring filenames; current `assets.php` is glob-based and `prepare-wordpress.js` writes a manifest. Remove outdated instruction to avoid mistakes.

---

### Root causes (why this happens)

- WordPress theme without header/footer prevents assets and inline localized data from being emitted consistently, so React never mounts.
- Split auth modes and partial JWT dependency: when JWT plugin isn’t fully configured, the current `LoginModal` can’t authenticate because it doesn’t use the safe `/pulse2/v1/login` proxy.
- Multiple code paths for API requests create inconsistent headers (nonce vs JWT vs both), which behave differently across endpoints.
- The frontend calls a superset of endpoints that were never implemented server-side, so many actions fail.
- Table-creation-on-init adds noise and complexity, making it hard to know what the source of truth is (CPT+meta JSON vs SQL tables).

---

### Impacted areas and severity

- App not mounting (theme/header-footer): Critical
- Login/session (JWT vs proxy): Critical
- Activity/presence and pin deletion: High
- Workflow/timeline advanced features: Medium/High (feature-level breakage)
- Build/deploy docs drift: Low (operational mistakes)

---

### Quick wins (can be done immediately)

- Ensure the active theme templates include `wp_head()` and `wp_footer()`.
- Install and configure a standard JWT plugin; set `JWT_AUTH_SECRET_KEY` and allowed CORS headers; verify `/jwt-auth/v1/token` works.
- Update frontend to prefer `/pulse2/v1/login` first; fall back to `/jwt-auth/v1/token`.
- Fix presence update to use PUT.
- Align `deletePin` with an implemented route (either add DELETE route server-side or reuse the existing PUT route to set `isResolved=true`).

---

### Longer-term structural fixes

- Centralize all network calls through `wpApiClient` (single place for JWT/nonce headers, retries, timeouts).
- Decide on one persistence model for whiteboards/moodboards (CPT+meta JSON is fine). Remove or delay unused custom SQL tables; if they stay, move creation to activation and add versioned migrations.
- Implement only the endpoints the UI needs now; explicitly hide unfinished UI actions or feature-flag them until the routes exist.
- Standardize media uploads through one path (prefer plugin endpoints for consistency with JWT/cookie auth).


