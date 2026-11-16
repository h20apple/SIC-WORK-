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
