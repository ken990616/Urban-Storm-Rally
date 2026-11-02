# Urban Storm Rally — ERLC monitor

This is a **first-stage connectivity monitor**, not an automatic race timer.

It reads the ERLC API v2 players section, counts players and writes the aggregate connection status to Firestore `races/apiStatus`. It does **not** invent GPS coordinates, move cars on the map or automatically start/finish a race.

## Google Cloud deployment

Project: `urban-storm-rally-c775d`

1. Enable billing and the Cloud Run, Cloud Build, Artifact Registry and Secret Manager APIs.
2. Create a secret named `erlc-server-key` in Secret Manager and enter your ERLC Server Key **there**, not in GitHub.
3. Create a dedicated runtime service account with Firestore write permission and Secret Manager Secret Accessor permission scoped to that secret.
4. Deploy the `backend/` directory as a Cloud Run service using the Dockerfile, with authentication required. Set `RUN_POLLING=true`, `POLL_INTERVAL_SECONDS=30`, and mount the secret as environment variable `ERLC_SERVER_KEY`.
5. For polling while no web requests arrive, set **minimum instances = 1**, **CPU always allocated / no CPU throttling**, and **maximum instances = 1**. These settings can incur continuous charges; review Cloud Run billing before deployment.
6. Verify Firestore `races/apiStatus` and Cloud Run logs. The `/health` endpoint reports connection state without exposing the key.

### Limitations
- Continuous background polling on Cloud Run needs an always-running instance; deployments and infrastructure restarts can interrupt it. A durable scheduled architecture is preferable for critical races.
- API limits must be respected. This sample defaults to a 30-second interval; do not assume the API allows faster requests.
- ERLC API player listing is **not** evidence of accurate world positions. Automatic start/finish detection is intentionally disabled until coordinate availability, coordinate mapping and polling precision are verified.
- Frontend manual timer operations still depend on the Firestore security rules allowing the currently authorized referee UID.
- Never commit the Server Key or a service account JSON file.
