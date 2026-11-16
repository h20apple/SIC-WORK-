# Firebase setup — SIC Sheet

This branch adds Firebase Authentication, Cloud Firestore and server-enforced roles without replacing the existing SIC Sheet layout. **It is not live until you create a Firebase project and supply the public web app configuration.**

## Firebase Console setup
1. Open https://console.firebase.google.com/ and create a Firebase project.
2. Add a **Web app** and copy its Firebase configuration into `firebase-config.js`. Never commit a service-account private key.
3. Authentication > Sign-in method: enable **Email/Password**. Disable public account creation in the UI; create users yourself in Authentication > Users.
4. Authentication > Settings > Authorized domains: add `h20apple.github.io` if needed for your sign-in configuration.
5. Firestore Database > Create database. Choose a region suitable for your organisation and data governance needs.
6. Firestore > Rules: paste the contents of `firestore.rules` and **Publish**. Never use test-mode rules in production.
7. Authentication > Users: create each user, copy their UID. In Firestore > Data, create a `users` collection and a document whose ID is that UID. Fields:
   - `role` (string): exactly `operator`, `chargeHand` or `manager`
   - `active` (boolean): `true`
   - `displayName` (string): optional name
   Role documents can only be created/edited by a trusted administrator using Firebase Console or Admin SDK, not the browser.
8. Create **your own manager account first** in Firebase Authentication and give its UID a `users/{uid}` document with `role: "manager"` and `active: true`.
9. Open the GitHub Pages site on a preview branch or local server and test with three accounts before merging into `main`.

## Data and access
- `users/{uid}`: administrator-managed role and active status.
- `sheets/{sheetId}`: owner UID, date key, sheet payload, draft/approved status, timestamps and optional approval metadata.
- Operator: create and edit own drafts, view own sheets.
- Charge Hand: view and edit all drafts, cannot approve.
- Manager: view/edit all, approve and reopen, delete if required.
- Approved sheets are read-only to operators and Charge Hands.
- Firestore rules are the source of truth; front-end controls are convenience only.
- Changes to role assignment and approvals should be audited if your organisation requires formal traceability.

## Notes
- Existing localStorage data is **not automatically uploaded**. Sign in, create a new cloud sheet or explicitly load local data and save it.
- Do not store personal or sensitive workplace data until you've confirmed permission to use this service, your data protection requirements, retention policy and appropriate Firebase project ownership.
- GitHub Pages hosts static code; Firebase handles sign-in and database operations.
- GitHub Pages may cache old scripts. Hard refresh after deployments.
- The browser uses Firebase modular SDK from the Google CDN. Internet is required for sign-in and cloud syncing.
- Run Firestore Emulator security-rule tests before production use. Current rules are an initial policy, not an audited production security design.
