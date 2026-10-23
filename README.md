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

- Game score rewards are requested through the `awardGameCoins` callable function; clients cannot directly increase wallet balances.
- The Ad Network uses `createAdCampaign`, `listMyAdCampaigns`, `listActiveAds`, `listPendingAds`, and `reviewAdCampaign` Cloud Functions.
- Targeted ads reserve at least 100 JMB Coins; site-wide campaigns reserve at least 500. Pending campaigns are not shown until an admin approves them. Rejected campaigns are refunded by the server.
- The advertising dashboard is `pages/ads.html`; sponsored placements are rendered by `js/ads/auto-render.js`.
- Before the features can run live, deploy the updated Firestore rules and Cloud Functions from a trusted Firebase CLI session:

```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
```

JMB Coins currently have an in-site reference value only. Real-money or LTC checkout is not enabled by this change. Configure and test payment handling separately before accepting funds.
