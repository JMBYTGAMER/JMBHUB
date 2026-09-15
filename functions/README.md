# Secure Discord sign-in

The public site cannot safely perform the Discord client-secret exchange by itself. This folder contains the ready-to-deploy server endpoint.

## 1. Create the Discord application

In the Discord Developer Portal, create an application and copy its **Client ID** and **Client Secret**. Add this exact redirect URL:

`https://us-central1-jmb-hub.cloudfunctions.net/discordOAuth`

## 2. Deploy the endpoint

From the project root:

```bash
firebase login
firebase use jmb-hub
firebase functions:secrets:set DISCORD_CLIENT_ID
firebase functions:secrets:set DISCORD_CLIENT_SECRET
firebase functions:secrets:set DISCORD_REDIRECT_URI
firebase functions:secrets:set DISCORD_STATE_SECRET
firebase functions:secrets:set JMB_FRONTEND_URL
firebase deploy --only functions:discordOAuth
```

Use these values when prompted:

- `DISCORD_REDIRECT_URI` = `https://us-central1-jmb-hub.cloudfunctions.net/discordOAuth`
- `DISCORD_STATE_SECRET` = a long random secret (keep it private)
- `JMB_FRONTEND_URL` = `https://www.jmbhost.qzz.io/pages/login.html`

Never commit the Client Secret or state secret.

The endpoint validates OAuth state, exchanges the code server-side, retrieves the Discord account, creates a Firebase custom token, and sends the token in the URL fragment rather than the HTTP query string.

## Password reset email service

JMBHUB now has a custom 5-minute password recovery flow. It sends a 6-digit OTP plus a **Verify now** link and keeps the reset request server-side.

The mailer uses SMTP. Set these Firebase Secret Manager values before deploying the functions:

```bash
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set RESET_FROM_EMAIL
firebase functions:secrets:set RESET_FRONTEND_URL
```

For Gmail SMTP, typical values are:

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=<the email account that sends JMBHUB mail>
SMTP_PASS=<that account's app password>
RESET_FROM_EMAIL=<the sender address>
RESET_FRONTEND_URL=https://www.jmbhost.qzz.io
```

Do not put an email password or app password in frontend files or commit it to Git. Firebase Secret Manager keeps these values out of the public website.

Then deploy:

```bash
firebase deploy --only functions,firestore:rules,auth
```

The reset request expires after 5 minutes, allows a maximum of five verification attempts, and is deleted after a successful password change.
