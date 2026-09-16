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

## JMBHUB Password Reset (5-minute OTP + Verify Now)

The custom password recovery flow uses the `requestPasswordReset`, `verifyPasswordReset`, and `completePasswordReset` functions. It sends a six-digit OTP plus a Verify now link. The reset token expires after 5 minutes.

Configure these Firebase Functions secrets before deploying:

```bash
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set RESET_FROM_EMAIL
firebase functions:secrets:set RESET_FRONTEND_URL
```

For Gmail SMTP, use `smtp.gmail.com`, port `465`, your sender address, and a Gmail App Password. Never put an email password or App Password in frontend files.

## Discord

Configure:

```bash
firebase functions:secrets:set DISCORD_CLIENT_ID
firebase functions:secrets:set DISCORD_CLIENT_SECRET
firebase functions:secrets:set DISCORD_REDIRECT_URI
firebase functions:secrets:set DISCORD_STATE_SECRET
firebase functions:secrets:set JMB_FRONTEND_URL
```

Set the Discord OAuth redirect URI to:
`https://us-central1-jmb-hub.cloudfunctions.net/discordOAuth`

Set `JMB_FRONTEND_URL` to:
`https://www.jmbhost.qzz.io`

Deploy all backend pieces with:

```bash
firebase deploy --only functions,firestore:rules
```
