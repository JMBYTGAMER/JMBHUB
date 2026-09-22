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
