# JMB HUB — Brand New Edition

This package is based on the working JMBHUB portal and keeps its existing Firebase/auth/admin/tool architecture while upgrading the public brand presentation.

## Added
- New JMB HUB logo: `assets/jmbhub-logo.png`
- JMB HUB title/brand metadata
- Canonical URL, OpenGraph and WebSite structured data
- Animated neon/aurora visual background
- Mobile/PC responsive branding
- PWA manifest, robots.txt and sitemap.xml

## Existing project features retained
- Login/auth architecture
- Games page and leaderboard architecture
- JMB Area tools
- Minecraft utilities
- JMB AI page
- Support/ticket page
- Admin page/role guards
- Firebase rules/config files already in the base project

## Important
Google indexing and the exact site name shown in Google results cannot be forced by code. The package gives Google strong JMB HUB signals; after deployment submit `sitemap.xml` and request indexing in Search Console.

## Deploy
Upload the contents to the ROOT of `JMBYTGAMER/JMBHUB`, keeping `.git` and any existing GitHub metadata. Keep `CNAME` as `www.jmbhost.qzz.io`.


## JMB Coins, game rewards and Ad Network

- A completed supported, score-positive game session can earn 1 virtual JMB Coin, with server-side cooldown checks through `awardGameCoins`; clients cannot directly increase wallet balances.
- Admin coin gifts arrive as inbox notifications and are only credited after the user presses **Collect reward**. Admins can inspect a wallet/transaction history, apply audited positive or negative adjustments, and grant or revoke supported profile/dashboard perks.
- JMBHUB includes a sound toggle with interface effects, reward notification chimes, and optional synthesized game ambience. Users can switch sound off.
- The Ad Network uses `createAdCampaign`, `listMyAdCampaigns`, `listActiveAds`, `listPendingAds`, and `reviewAdCampaign` Cloud Functions.
- Targeted ad campaigns reserve at least 100 virtual JMB Coins; site-wide campaigns reserve at least 10,000. Approved site-wide campaigns can be rendered on the public landing page and eligible portal pages that include the sponsored-placement module, for up to 30 days. Pending campaigns are not shown until an admin approves them. Rejected campaigns are refunded by the server.
- The advertising dashboard is `pages/ads.html`; sponsored placements are rendered by `js/ads/auto-render.js`.
- Before the features can run live, deploy the updated Firestore rules and Cloud Functions from a trusted Firebase CLI session:

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

JMB Coins are virtual in-site credits only; they are not rupees, cash, or withdrawable funds. UPI, LTC and other crypto top-ups—and the proposed $100 global-ad package checkout—are intentionally disabled until a suitable payment provider, server-side payment verification, and appropriate account/guardian arrangements are configured and tested. Do not accept manual payment proofs or mark a payment as paid based on a submitted form.
