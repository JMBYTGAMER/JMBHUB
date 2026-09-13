// Template only. Deploy as a Firebase Cloud Function or another secure backend.
// Keep DISCORD_CLIENT_SECRET in server-side environment variables.
// The frontend points to this endpoint through APP_CONFIG.DISCORD_OAUTH_URL.

export async function discordOAuthHandler(req,res){
  if(req.method!=='GET'){res.status(405).send('Method Not Allowed');return}
  res.status(501).send('Implement Discord OAuth code exchange here, then issue/sign in a Firebase custom token securely.');
}
