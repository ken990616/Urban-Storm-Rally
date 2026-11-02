# Cloudflare Worker — Urban Storm Rally

This Worker is a referee-only ERLC API relay. It verifies the logged-in referee with Firebase Authentication before querying ERLC. The ERLC Server Key stays in Cloudflare Secret settings.

## Deploy for free
1. Sign in at https://dash.cloudflare.com/ and open **Workers & Pages**.
2. Create a Worker named `urban-storm-rally-api`. Open **Edit code**.
3. Replace the starter code with the complete contents of `worker.js` and deploy.
4. Open **Settings → Variables and Secrets → Add**, choose **Secret**, name `ERLC_SERVER_KEY`, enter your key, and deploy the change.
5. Copy the Worker public URL, usually `https://urban-storm-rally-api.<subdomain>.workers.dev`.
6. Sign in to the rally website as the authorized referee; enter the Worker URL in the referee API panel, then click **測試 API**. The website sends the Firebase login token; it never sends the ERLC key.
7. The Worker currently reads **player count only**. It does not update Firestore or run while the referee tab is closed. Do not interpret this as automatic GPS timing.

**Security**: Firebase ID token is verified using Google's Identity Toolkit endpoint and the exact referee UID. Origin checks are supplementary, not the authorization mechanism. Only the aggregate count is returned. Do not commit the ERLC Server Key to GitHub.

**Free-tier**: Cloudflare Workers Free is usage-limited; review current plan limits before use. The ERLC API has separate rate limits.
