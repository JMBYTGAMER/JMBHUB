# JMB Portal

A polished, GitHub Pages-ready personal portal for JMB.

## Included
- Landing page + authentication
- Google + Email/Password Firebase Authentication
- Discord OAuth backend hook
- Dashboard with configurable services
- JMB Games: Snake, Click Rush, Reaction, Target Shooter
- Per-game + overall leaderboards using Firestore
- JMB Area: calculator, QR generator, QR scanner, code tester, mini game maker, file tools
- Minecraft command + kit generator with high enchantment levels
- Support ticket system with owner/admin panel
- Maintenance / Coming Soon controls
- Mobile-first glass UI

## GitHub Pages deployment
1. Upload all extracted files so `index.html` is at repository root.
2. GitHub: Settings -> Pages -> Deploy from branch -> `main` -> `/ (root)`.
3. Open the deployed site.

## Firebase setup
1. Create a Firebase project.
2. Add a Web App.
3. Copy the config into `js/config/firebase-config.js`.
4. Enable Authentication providers: Email/Password and Google.
5. Create Firestore Database.
6. Publish `firebase/firestore.rules`.
7. Optional: enable Firebase Storage and publish `firebase/storage.rules`.

### Security
The Firebase web config is not a secret. Your Firestore/Storage rules are what protect data.
Never place Firebase Admin SDK credentials, Discord client secrets, or other server secrets in this repository.

### Owner/admin model
The frontend marks `jobinmathewbiju@gmail.com` as the configured owner for UI purposes. For real security, create an owner/admin custom claim with the included server template or maintain a protected admin collection and enforce it in Firestore Rules.

## Discord login
Firebase does not provide a simple built-in Discord provider for this static frontend. Set `DISCORD_OAUTH_URL` in `js/config/app-config.js` to your secure backend endpoint. The backend should perform Discord OAuth and return a Firebase custom-token flow or a supported identity token flow. Keep the Discord client secret server-side.

## Local preview
Any static server can preview the site. GitHub Pages itself cannot run Node/Python backend code; the `functions/` folder is a deployment template, not part of the GitHub Pages runtime.

## GitHub Pages paths
All internal links use relative paths, so this works from both a repository project site (`username.github.io/repository`) and a custom domain.

## File sharing
JMB Area can upload files to Firebase Storage under the signed-in user's own path and create a Firestore share record. Storage rules restrict files to their owner. Public sharing URLs should only be shared intentionally.

## Important production note
No static site can safely implement privileged admin actions by hiding buttons. The supplied Firestore rules use the Firebase auth token (`admin` custom claim or the configured owner email) for privileged operations. Use a secure backend/Cloud Function to assign admin custom claims.
