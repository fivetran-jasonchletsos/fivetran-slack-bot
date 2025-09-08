Fivetran Slack Bot

Slack bot for viewing connector status and triggering syncs via the Fivetran REST API.

## Features

- Slash commands:
  - `/fivetran-status all` — list up to 20 connector statuses
  - `/fivetran-status <connector-id-or-alias>` — show a connector's status
  - `/fivetran-sync <connector-id-or-alias>` — trigger a sync
  - `/fivetran-help` — show usage help
- Post-sync notification: When you trigger a sync, the bot polls and sends you an ephemeral message when it finishes.
- Health endpoint at `/health`

## Requirements

- Node.js 18+
- Slack App (Bot Token + Signing Secret)
- Fivetran API Key and Secret

## Quick start

```bash
# One-command setup
npm run setup

# Or manual setup
npm install
cp env.example .env
# edit .env with your credentials
npm run validate
npm start
```

The app exposes Slack events at `/slack/events` and a health check at `/health`.

For detailed setup instructions, see [SETUP.md](SETUP.md) or [QUICK_START.md](QUICK_START.md).

## Environment variables

Create a `.env` file:

```
SLACK_SIGNING_SECRET=...
SLACK_BOT_TOKEN=xoxb-...
PORT=3000
FIVETRAN_API_KEY=...
FIVETRAN_API_SECRET=...
FIVETRAN_API_BASE=https://api.fivetran.com/v1
FIVETRAN_CONNECTOR_MAP={"salesforce":"<connector-id>","hubspot":"<connector-id>"}
```

- `FIVETRAN_CONNECTOR_MAP` is optional JSON to map human-friendly names to connector IDs used in slash commands.

Default alias resolution:
- When you pass a value to commands, the bot will try in order:
  1) Treat the value as a connector ID
  2) Match by `schema`
  3) Match by `service`
  4) Partial match on `schema` or `service`
  If a unique match is found, it will use that connector.

## Slack app setup

- Option A: Use the included manifest
  1. Go to `https://api.slack.com/apps` → Create New App → From an app manifest
  2. Paste the JSON from `slack-app-manifest.json`
  3. Replace `YOUR-PUBLIC-URL` with your ngrok/production URL
  4. Install the app to your workspace and copy the Bot Token

- Option B: Manual setup
  - Enable the Events API and set Request URL to your public URL `/slack/events`.
  - Add Slash Commands:
    - `/fivetran-status` → Request URL: `https://your-url/slack/events`
    - `/fivetran-sync` → Request URL: `https://your-url/slack/events`
  - Install the app to your workspace and copy the Bot Token.

- Option C: Socket Mode (no public URL)
  1. Create new app from manifest using `slack-app-manifest-socket.json`
  2. Enable Socket Mode on the app and generate an App-Level Token with `connections:write`
  3. Set env vars: `SLACK_SOCKET_MODE=1`, `SLACK_APP_TOKEN=xapp-...`, `SLACK_BOT_TOKEN=xoxb-...`
  4. Start the app. No ngrok needed.

For local development, you can use ngrok:

```bash
npm start
ngrok http 3000
# Use https URL from ngrok for Slack Request URL
```

## Scripts

- `npm run setup` — one-command project setup
- `npm start` — run the server
- `npm run validate` — validate configuration
- `npm test` — run tests (does not require Slack/Fivetran)
- `npm run test:integration` — test with real API credentials

## Testing

```bash
npm test
```

The tests run the server with Slack disabled using `SKIP_SLACK=1` and validate the health endpoint.

## Deployment

See `docs/DEPLOYMENT.md` for production notes.

## Step-by-step: Configure and deploy

1) Create Slack app via manifest
   - Import `slack-app-manifest.json` at `https://api.slack.com/apps`
   - Replace `YOUR-PUBLIC-URL` with your public URL (ngrok for dev)
   - Install to workspace; grab `SLACK_BOT_TOKEN` and `SLACK_SIGNING_SECRET`

2) Set environment variables
   - Copy `.env.example` → `.env`, fill in Slack and Fivetran credentials
   - Optional: set `FIVETRAN_CONNECTOR_MAP` for friendly aliases

3) Start locally
   - `npm install`
   - `npm run validate` (expects real env vars)
   - `npm start` (in Socket Mode, only tokens are required)
   - `ngrok http 3000` and update Slack URLs if needed

4) Test in Slack
   - `/fivetran-help`
   - `/fivetran-status all` (click Trigger Sync on a connector)
   - `/fivetran-status <id|schema|service>`
   - `/fivetran-sync <id|schema|service>`

5) Deploy
   - Use any Node 18+ host. Ensure `/slack/events` and `/health` are reachable.
   - Set the same env vars on the host.
   - Run `node src/app.js` or `npm start`.

## References

- Fivetran Connector SDK docs: [Connector SDK - Build Custom Connectors](https://fivetran.com/docs/connector-sdk)

## License

MIT



