# Username-only login and manager-managed accounts

The website now shows **Username** and **Password** (no email field). Supabase Auth still needs an internal email-format identifier, so usernames are mapped privately to `lowercase-username@sic-users.invalid`. These are **not real email addresses**; email confirmation, password reset emails and invitation emails cannot be delivered. Plan a manager-assisted password reset workflow before production.

**Not deployed yet.** These Edge Functions must be deployed by the Supabase project owner. Do not merge the GitHub branch into main until tested.

## First manager account (one-time bootstrap)
1. Supabase Dashboard > Authentication > Users > Add user. Create an account using `rossadmin@sic-users.invalid` (or another username at the same reserved domain) and a unique strong password. Mark email confirmed.
2. Copy its Auth user UUID.
3. Table Editor > `public.profiles` > Insert row with `id` equal to the UUID, `role` = `manager`, `active` = true. The login username will be `rossadmin` in this example.
4. This is the only manual bootstrap account; subsequent accounts are created through the manager panel.

## Deploy the functions
Install the Supabase CLI on a trusted computer, log in to your project, then run:
```sh
supabase login
supabase link --project-ref dlunkbfuentjnwukqyia
supabase functions deploy username-login --no-verify-jwt
supabase functions deploy manage-staff --no-verify-jwt
```
The manage-staff function **manually verifies** the user's bearer token and checks the manager role before using the server-only service-role secret. Do not put that secret in GitHub or browser JavaScript. Supabase-hosted functions normally expose `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` as environment variables; verify these are present in your project.

The public username-login endpoint uses Supabase's password verification, but production deployments should also have rate limiting, abuse monitoring and account lockout/recovery policies. Never use this for sensitive workplace data without security testing.

## Test
- Open a branch preview (or locally serve the branch) and sign in using `rossadmin` and its password.
- In the manager-only Create staff account panel, create an operator and a Charge Hand.
- Verify an operator can only view own sheets, Charge Hand can edit all drafts, Manager can approve/reopen, and unauthorised accounts cannot manage users.
- Only after the SQL schema, Edge Functions and tests pass should you merge into `main`.

---

# Supabase setup for SIC Sheet

Branch: `feature/supabase-auth-sheets`. Existing GitHub Pages main site is unchanged.

## Complete these steps in Supabase Dashboard
1. Go to **SQL Editor** and run `supabase-schema.sql`. This creates profiles, sheets, role checks and Row Level Security (RLS).
2. Go to **Authentication > Providers > Email** and enable email/password. Disable public signups (Authentication > Settings / Sign In / Sign Up) if this is an invite-only workplace tool.
3. In **Authentication > Users**, create your account and any test accounts. Copy each user's UID.
4. In **Table Editor > profiles**, insert one row per user: `id` = their Authentication UID, `role` = `operator`, `charge_hand` or `manager`, `active` = true. Only use Dashboard/trusted admin to assign roles. Give your own UID `manager`.
5. In **Authentication > URL Configuration**, set Site URL to `https://h20apple.github.io/SIC-WORK-/` and allow that URL as a redirect if your authentication settings need it.
6. Optional live cross-device updates: enable `public.sheets` in **Database > Publications > supabase_realtime**. Otherwise manual refresh and saves still work.
7. Test with separate Operator, Charge Hand and Manager accounts. Confirm operator cannot read another user's sheet, Charge Hand cannot approve, and approved sheets are locked for both.
8. After testing, merge this branch into `main` to publish on GitHub Pages.

## Security and behaviour
- Supabase project URL and **publishable** key are public client configuration. **Never commit a secret key or service_role key.**
- RLS on `profiles` and `sheets` enforces access on the server.
- Only the Supabase Dashboard / trusted administrator can create or change role records.
- Operator: view and edit own draft sheets.
- Charge Hand: view/edit all drafts.
- Manager: view/edit all sheets, approve/reopen.
- Existing offline sheet data stays on the device until explicitly copied into a new cloud sheet.
- The original local Save Backup, Restore and Print functions remain.
- The cloud panel is an initial integration, not a formally audited workplace data system. Verify employer approval, data retention and privacy requirements before real use.
- Cloud sync requires internet; the local form still functions without a connection.
