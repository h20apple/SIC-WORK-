# SIC WORK — Change history and operating guide

Updated: 17 November 2026. This is a product change log, **not** a substitute for the database audit trail. Dates before this entry are approximate unless backed by a linked commit.

## 17 November 2026 — Final Product Sheet temporarily paused
- Removed the Final Product Sheet navigation link from SIC while a replacement is prepared.
- The old Final Product URL now displays a temporary-unavailable page instead of the old form.
- Operator accounts remain signed in on the SIC login/control screen with an unavailable notice and working sign out, rather than redirecting to the retired form.
- Existing Supabase Final Product records and the prior form source remain untouched in the database/Git history for later migration. No data was deleted.

## 17 November 2026 — Sign out across every staff screen
- Unified sign out on the SIC Sheet, Manager Dashboard and Manager welcome/choice screen; all show confirmation, disable duplicate clicks, and report failures.
- SIC sign out attempts to save editable cloud changes before ending the session, refusing to sign out if saving fails.
- Final Product sign out now handles errors, clears the prior form and saved-record selection, and returns to the sign-in page.
- Verified both JavaScript files parse and all four sign-out buttons/handlers exist. Live multi-user browser sign-out tests remain outstanding.

## 17 November 2026 — Manager dashboard sign out
- Added a visible **Sign out** button in the Manager Dashboard header, including on the dashboard view where the cloud controls are hidden.
- Requires confirmation, signs out through Supabase Auth, clears private SIC browser state and returns to the login page.
- On failure, the dashboard reports the error instead of pretending sign out succeeded.

## 17 November 2026 — Fix cross-account page routing
- Fixed Final Product showing as the default landing page after a different user signs in on the same device. Operator defaults to Final Product; Charge Hand and Manager default to SIC / Manager dashboard.
- On account identity changes, Final Product clears its previous selected record and form before loading the new account, and ignores outdated account lookup responses.
- Users can still deliberately open Final Product from the SIC page using its dedicated link (`?view=1`); that does not change their default landing page.
- Role switching and data isolation require real multi-account browser testing; no production user data was changed for this fix.

## 17 November 2026 — Create accounts inside Accounts tab
- Moved the existing staff account creation form into **Manager Dashboard → Accounts** instead of directing administrators to the hidden cloud panel.
- Authorised account administrator (`rossadmin`) can enter username, optional display name, temporary password (12+ characters), and Operator / Charge Hand / Manager role.
- The form calls the existing authenticated `manage-staff` Edge Function, reports errors in the Accounts tab, clears sensitive fields on success and refreshes the account list.
- Account creation remains restricted to the authorised administrator; ordinary Managers cannot create users.

## 17 November 2026 — Connectivity safeguards
- Added an always-visible offline warning when the browser reports no network connection.
- Pauses automatic cloud-save scheduling while offline and retries the active editable sheet after reconnecting.
- This is **not** a guaranteed offline queue: unsynced edits may still be lost if browser storage is cleared, the user signs out, or the device fails. Cloud status must be verified after reconnecting.

## 17 November 2026 — Manager security and recovery
- Managers open the Dispatch Control dashboard first. The SIC form is a **read-only review view** for Managers.
- Charge Hands create and edit draft SIC Sheets. Operators use the Final Product Sheet.
- Managers can review, approve and reopen saved SIC Sheets. Approval/reopening is performed by a permission-checked Supabase RPC rather than a general client update.
- Database row-level policies disallow Manager creation and direct production-field updates; a trigger protects ownership, approval and status fields from Charge Hand edits.
- Managers can delete a sheet using a confirmation dialog and the typed word `DELETE`. A database trigger archives its complete row before removal. The **Deleted sheets** dashboard tab lets Managers restore archived sheets.
- Deleted sheets are hidden from the active production dashboard until restored. The archive is visible only to active Managers. The archive currently has no automatic retention/purge policy.
- Dashboard navigation was improved to keep tabs available, including on mobile.

## 17 November 2026 — Manager dashboard and mobile layout
- Overview by Deli 1–3 and Line 1–4, recent sheet search and status filtering.
- Production insights and downloadable CSV summary, staff directory, audit logs and authorised account management.
- Phone-friendly table cards, scrolling navigation and larger touch targets.
- Dashboard reporting is based on a capped recent set of saved records (currently up to 500); it is **not** an all-time accounting report.

## Existing SIC / Final Product workflow
1. **Operator:** signs in to the Final Product Sheet and completes checks.
2. **Charge Hand:** signs in to the SIC Sheet, chooses Deli and Line, enters production data and saves a cloud draft.
3. **SIC calculations:** packs produced from units per tray × trays, production/waste tracking and product-code lookup. Review the calculated figures against the original production paperwork.
4. **End of shift:** Charge Hand completes the sheet and marks end of shift.
5. **Manager:** opens the dashboard, reviews the saved sheet, approves or reopens it, and can recover mistakenly deleted records from Deleted sheets.
6. **Printing:** SIC is designed for A4 landscape; on phones the paper layout may require sideways scrolling.

## What the statuses mean
- **Draft:** still editable by a Charge Hand, subject to access permissions.
- **Approved:** Manager has signed off; not editable as a draft until reopened.
- **Deleted / archived:** removed from the active list but retained in the Manager recovery archive.

## Data protection and limitations
- The SIC form has local browser saving and cloud synchronisation, but a **durable offline upload queue has not been verified or completed**. Avoid assuming unsynced changes will survive browser storage clearing or a device failure.
- Cloud updates use an `updated_at` concurrency check, but simultaneous edits still need end-to-end testing.
- Browser/interface checks and static tests have passed; **full authenticated browser, offline, and real-user role testing are still outstanding**.
- Archived-sheet recovery has been verified at schema/function level, but **a live deletion/restoration round-trip has not been executed** against production records.
- The current dashboard's **Audit logs** tab is an activity log, not this development history. Do not confuse the two.
- Do not use the production environment for destructive tests on real records.

## Maintenance and testing
- Source: https://github.com/h20apple/SIC-WORK-
- Live: https://h20apple.github.io/SIC-WORK-/
- CI runs: https://github.com/h20apple/SIC-WORK-/actions
- Key code: `index.html`, `sic-app.js`, `supabase-sync.js`, `final-product.html`, `final-product.js`.
- Dashboard tests: `tests/manager-dashboard.test.cjs`; browser tests: `tests/browser/`.
- To report a problem: record the role, device/browser, exact action, sheet date and Deli/Line, expected result and actual result. Do not share passwords.

## Planned work (not yet complete)
- Reliable offline sync queue with clear saved/pending/error states.
- Dedicated test users for Operator, Charge Hand and Manager; role-based end-to-end tests.
- End-to-end archive/restore tests on disposable test records.
- Production data validation and discrepancy alerts before Manager approval.
- Tested A4 printing on iPhone and desktop, plus accessibility and performance checks.
