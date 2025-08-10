## Pulse 2 — Remediation Roadmap and Implementation Steps

This roadmap converts the RCA into a concrete, phased plan with explicit tasks, owners, and acceptance checks.

### Phase 0 — Environment sanity (Same day)

1) Fix WordPress theme output hooks
   - Task: Ensure the active theme’s `header.php` contains `<?php wp_head(); ?>` and `footer.php` contains `<?php wp_footer(); ?>`.
   - Owner: WP Ops
   - Acceptance: Visiting a page with `[pulse2]` loads `vendor-*.js`, `index-*.js`, `index-*.css` in the page HTML. React app mounts (`Pulse 2 React app initialized successfully` console log appears).

2) JWT plugin and CORS
   - Task: Install and configure the standard JWT Auth plugin (or equivalent), set `JWT_AUTH_SECRET_KEY` in `wp-config.php`, configure CORS to allow the site origin.
   - Owner: WP Ops
   - Acceptance: `POST /wp-json/jwt-auth/v1/token` returns `{ token: ... }` for a known user.

3) Permalinks and REST flush
   - Task: Save permalinks once in WP Admin; or run rewrite flush if needed.
   - Owner: WP Ops
   - Acceptance: Visiting `GET /wp-json` returns the WP index and `GET /wp-json/pulse2/v1` lists Pulse 2 routes.

### Phase 1 — Authentication coherence (1–2 days)

4) Frontend login flow
   - Task: Change `LoginModal` to call `/wp-json/pulse2/v1/login` first; if 404 or explicit JWT error, fall back to `/wp-json/jwt-auth/v1/token`.
   - Task: On success, store `jwtToken`, `userId` via `/pulse2/v1/me`, and display name.
   - Owner: Frontend
   - Acceptance: Users can log in even if the JWT plugin is missing; if present, they receive a JWT. Subsequent API calls succeed.

5) Header centralization
   - Task: Route all requests through `wpApiClient` (including `workspaceService`, `activityService`, `notesService`, `useUserManagement`). Remove manual fetch header duplication. Ensure both JWT and `X-WP-Nonce` are set when available.
   - Owner: Frontend
   - Acceptance: One place (`apiClient`) controls headers, retries, and timeouts. Random 401/nonce mismatches disappear.

### Phase 2 — Endpoint alignment (2–3 days)

6) Presence endpoint method
   - Task: Change `useUserManagement.updatePresence` to use PUT instead of POST.
   - Owner: Frontend
   - Acceptance: Presence updates return 200 and appear in logs.

7) Pin delete/write behavior
   - Option A (preferred short-term): Add a new REST route in `workspaces-json.php`:
     - `DELETE /workspaces-json/pins/(?P<pin_id>[a-zA-Z0-9\-]+)` that removes the pin from JSON and returns `{ success: true }`.
   - Option B: If DELETE is not desirable, expose `PUT /workspaces-json/pins/{id}` to set `isResolved=true` and update frontend to call that.
   - Owner: Backend + Frontend
   - Acceptance: Deleting a pin in UI updates server and reload reflects new state.

8) Implement only the UI-used routes now
   - Task: For workflow/timeline, implement the minimal routes the UI actually calls today (confirm via grep over `workspaceService`). Defer nonessential routes behind feature flags.
   - Owner: Backend
   - Acceptance: No 404s for currently clickable actions; hidden/disabled buttons for unfinished features.

### Phase 3 — Media and uploads (1 day)

9) Standardize media upload path
   - Task: Prefer plugin endpoints for uploads (`POST /workspaces-json/{workspaceId}/images`) and attach (`POST /workspaces-json/{workspaceId}/images/attach`); keep `wp/v2/media` as a fallback when JWT cookie auth is confirmed working.
   - Owner: Frontend
   - Acceptance: Uploads succeed for authenticated users without CORS/cookie surprises.

### Phase 4 — Operational clarity (0.5 day)

10) Clean docs
   - Task: Update `md and summary/How to compile.txt` to reflect the glob/manifest-based asset loading. Remove instructions to hand-edit filenames.
   - Owner: Frontend
   - Acceptance: Build instructions: `npm run build` places assets in `wordpress/pulse2/build`; no manual filename edits required. `prepare-wordpress.js` manifest is optional info only.

### Phase 5 — Data model and performance (2–3 days)

11) Migrations and activation
   - Task: Move table creation from `init` to activation (`register_activation_hook`) with idempotent versioned migrations. Keep JSON (CPT meta) as current source-of-truth for whiteboard/moodboard.
   - Owner: Backend
   - Acceptance: No table DDL executes on normal page loads; activation logs success.

12) Feature flags
   - Task: Introduce a simple plugin option (and localized flag) to toggle unfinished workflow/timeline features. Hide UI when disabled.
   - Owner: Backend + Frontend
   - Acceptance: No dead buttons; UX clearly indicates what’s available.

### Phase 6 — Hardening and tests (ongoing)

13) E2E happy-path checks (manual or Playwright)
   - Login; list projects; create project; create workspace; upload image; add/remove pin; add note; view activity.
   - Owner: QA
   - Acceptance: All pass on a clean site.

14) Logging, monitoring
   - Task: Keep `pulse2_debug_log` but reduce verbosity in production. Add error responses with clear messages and HTTP status codes.
   - Owner: Backend
   - Acceptance: WordPress error log is clean under normal operations.

---

## Task checklist by file

- Frontend
  - `src/components/LoginModal.tsx`: prefer `/pulse2/v1/login`, fallback to JWT; on success, fetch `/pulse2/v1/me`.
  - `src/hooks/useUserManagement.ts`: update presence to PUT; route all network calls through `wpApiClient`.
  - `src/services/workspaceService.ts`, `src/services/activityService.ts`, `src/services/notesService.ts`: use `wpApiClient` consistently; fix `deletePin` path; avoid direct `fetch`.
  - `src/lib/apiClient.ts`: ensure `X-WP-Nonce` and Bearer are applied when available.

- WordPress plugin
  - `includes/frontend/assets.php`: keep glob-based script/style registration; confirm localized `pulse2` values.
  - `includes/frontend/shortcodes.php`: unchanged; `[pulse2]` prints `#pulse2-root > #root`.
  - `includes/workspaces-json.php`: add `DELETE /workspaces-json/pins/{pin_id}` or support resolve via PUT and document behavior.
  - `includes/rest/rest-routes.php`: ensure routes required by the current UI exist; add feature flags for unfinished parts.
  - `includes/core/database.php`: move DDL calls to activation and guard with versioning.

---

## Acceptance test script (manual)

1) Open a page with `[pulse2]` in an incognito window.
2) Verify assets load (network tab shows vendor/index/ui bundles) and React console message appears.
3) Login via modal; ensure token is stored; `/pulse2/v1/me` returns the user.
4) Create a project; verify in UI.
5) Create a whiteboard; upload an image; add and then delete a pin; refresh and confirm state.
6) Add a note; confirm it appears in activity feed.
7) Toggle presence (relogin) and verify no 405 for presence.


