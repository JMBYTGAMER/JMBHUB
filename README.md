# JMBHUB

JMB HUB is a mobile-first community portal for games, tools, Minecraft utilities, AI, global chat and support.

## Security
- Provider secrets and OAuth secrets belong only in the backend/secret manager.
- Firestore and Storage rules reject unauthenticated access and validate user-owned writes.
- Admin/owner controls are gated by Firebase Auth/custom claims and database rules.
- The browser cannot be made impossible to inspect; public frontend code is always downloadable.
- Leaderboard scores are bounds-checked client writes. Server-authoritative anti-cheat would require a trusted backend for high-stakes score verification.

## Discord OAuth
Deploy the `functions/discordOAuth` function and configure its secrets from `functions/README.md`. Never commit a Discord client secret.

## Google Search
The public homepage contains a canonical URL, sitemap, robots rules, Open Graph metadata and WebSite/Organization structured data for clearer indexing and site-name understanding. Search indexing and ranking are controlled by search engines; after deployment, submit the sitemap and inspect the homepage in Google Search Console.


## Production setup
- Deploy Firestore rules and Storage rules before launch.
- Configure Discord OAuth secrets only with Firebase Secret Manager.
- Deploy the Functions in `functions/index.js` for trusted Global Chat and staff role management.
- Google/Email authentication is handled by the Firebase client SDK; provider settings and authorized domains must be configured in the Firebase Console.
- The admin route is guarded in the UI and the underlying data is protected by Firestore rules.
