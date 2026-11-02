// Urban Storm Rally — authenticated ERLC API relay (Cloudflare Workers Free).
// Set ERLC_SERVER_KEY as a Worker Secret. Never expose it to the browser.
const ORIGIN = "https://ken990616.github.io";
const PROJECT = "urban-storm-rally-c775d";
const ADMIN_UID = "adClrs4et6djk40guKB4lWSnyg73";
const FIREBASE_API_KEY = "AIzaSyBv0VJ3WbalJs7wLF3CZsTj-2HJtOuea38"; // Firebase web API key is not a secret
const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Vary": "Origin",
  "Cache-Control": "no-store",
};
const json = (body, status=200) => new Response(JSON.stringify(body), {
  status, headers: {...cors, "Content-Type": "application/json; charset=utf-8"}
});
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (origin && origin !== ORIGIN) return json({error:"origin_not_allowed"},403);
    if (request.method === "OPTIONS") return new Response(null,{status:204,headers:cors});
    if (request.method !== "GET" || url.pathname !== "/players") return json({error:"not_found"},404);
    const token = (request.headers.get("Authorization")||"").match(/^Bearer (.+)$/)?.[1];
    if (!token) return json({error:"login_required"},401);
    // Verify Firebase ID token server-side using Firebase Auth's accounts:lookup endpoint.
    let user;
    try {
      const authResponse = await fetch(
        "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="+encodeURIComponent(FIREBASE_API_KEY),
        {method:"POST",headers:{"Content-Type":"application/json"},
         body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(10000)}
      );
      if (!authResponse.ok) return json({error:"invalid_login"},401);
      const auth = await authResponse.json();
      user = auth.users?.[0];
    } catch { return json({error:"auth_service_unavailable"},503); }
    if (!user || user.localId !== ADMIN_UID || user.disabled) return json({error:"referee_only"},403);
    if (!env.ERLC_SERVER_KEY) return json({error:"server_key_not_configured"},503);
    try {
      const response = await fetch("https://api.erlc.gg/v2/server?Players=true",{
        headers:{"Server-Key":env.ERLC_SERVER_KEY,"Accept":"application/json"},
        signal:AbortSignal.timeout(15000)
      });
      if (!response.ok) return json({error:"erlc_api_error",status:response.status},response.status===429?429:502);
      const payload = await response.json();
      const players = Array.isArray(payload)?payload:
        Array.isArray(payload.Players)?payload.Players:
        Array.isArray(payload.players)?payload.players:null;
      if (!players) return json({error:"unexpected_erlc_response"},502);
      // Only return aggregate player count. No raw server details or secrets.
      return json({ok:true,playerCount:players.length,updatedAt:new Date().toISOString(),autoTiming:false});
    } catch { return json({error:"erlc_network_error"},502); }
  }
};
