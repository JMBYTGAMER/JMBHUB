# JMB HUB security operations

JMB HUB is a static web app backed by Firebase Authentication, Cloud Firestore,
Cloud Functions and (currently unused) Firebase Storage. Repository code alone cannot
secure the Google, Firebase, Cloudflare and GitHub accounts that own the project.

## Repository hardening included

- Explicit Firestore permissions, stricter field validation and a default-deny fallback.
- Verified-email checks for owner/admin permissions in client UI, Firestore Rules and
  Cloud Functions.
- Users can create bounded support tickets and suggestions, but cannot rewrite their
  own ticket status or support replies.
- Wallets, coin transactions, coin gifts, purchases and entitlements remain
  server-managed.
- Firebase Storage is closed by default because the current site does not upload files.
  Add a narrow path, MIME-type, file-size and ownership policy before enabling uploads.
- Cloud Function Auth directory and ad-list reads are bounded.
- Optional Firebase App Check support for reCAPTCHA Enterprise.
- Emulator permission tests, CodeQL and Dependabot automation.

## Deploy Firebase-side changes

GitHub Pages does **not** deploy Firebase Rules or Cloud Functions. From the JMB HUB
repository in your Codespace, run:

```bash
firebase use jmb-hub
firebase deploy --only firestore:rules,storage
firebase deploy --only functions
```

Before deployment, sign into the owner account and confirm its Firebase Auth email is
verified. Owner-only console and server-side owner actions now require a verified email.
If that account is not verified, verify it in Firebase Authentication before deploying.

After deployment, check Firebase Console → Firestore → Rules and Storage → Rules and
confirm the published rules match this repository. Inspect the Functions deployment
output for errors.

## Enable App Check

The client is ready for reCAPTCHA Enterprise App Check, but enforcement needs a site key:

1. In the Google Cloud project for JMB HUB, create a score-based reCAPTCHA Enterprise
   web key and register only the production hostnames you use.
2. In Firebase Console → Security → App Check, register the JMB HUB web app with the
   reCAPTCHA Enterprise provider and use that matching key.
3. Put the **public site key** in `appCheckSiteKey` in
   `js/config/firebase-config.js`. Keep the reCAPTCHA secret key in the console only.
4. Deploy the website and monitor App Check metrics while real users access the portal.
5. When legitimate traffic has valid tokens, enable enforcement for Cloud Firestore,
   Cloud Storage and callable Cloud Functions. Enable Authentication enforcement only
   after checking current support/status in Firebase Console.

App Check blocks some unauthorized clients; it does not make a public website
unhackable. Keep server-side authorization and Firestore Rules in place.

## Account and repository checklist

- Enable 2-step verification or passkeys on the Google account that owns Firebase, plus
  GitHub and Cloudflare. Keep recovery codes private and offline.
- Use a unique password for the owner email. Never share passwords or one-time codes.
- In Firebase Authentication, enable email-enumeration protection, configure a sensible
  password policy, enable multi-factor authentication for owner/admin accounts, and
  remove unused sign-in providers and authorized domains.
- In Google Cloud Console, restrict the browser Firebase API key by HTTP referrer to the
  production hostnames and only the APIs the portal uses. A Firebase web API key is
  public browser configuration, not an admin credential; Rules and App Check protect data.
- Keep service-account JSON, private OAuth client secrets, reCAPTCHA secret keys, private
  signing keys and GitHub tokens out of the repository. Rotate any credential that was
  ever committed.
- In GitHub Settings, enable secret scanning and push protection where available. Protect
  `main`: require pull requests and the validation/security checks, and disallow force
  pushes and branch deletion.
- In Cloudflare, enable managed WAF rules and bot protections for production hostnames.
  A Response Header Transform Rule can add:
  `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, and
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
  Add HSTS only after confirming all covered hostnames are HTTPS-only. Test Google and
  Discord sign-in after changing cross-origin or frame headers.
- Review Dependabot updates and CodeQL alerts rather than blindly merging changes.

## Safe testing and limitations

Use the Firebase Emulator rule tests in GitHub Actions for permission checks. Test only
JMB HUB accounts and data you own. Avoid password guessing or disruptive load tests.
Repository changes cannot activate Firebase Console enforcement, Google account MFA,
Cloudflare WAF rules, GitHub settings or a live Firebase deployment; complete those
console steps separately.
