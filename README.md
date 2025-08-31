Fivetran Slack Bot

Slack bot for viewing connector status and triggering syncs via the Fivetran REST API.

## Features

- Slash commands:
  - `/fivetran-status all` — list up to 20 connector statuses
  - `/fivetran-status <connector-id-or-alias>` — show a connector's status
  - `/fivetran-sync <connector-id-or-alias>` — trigger a sync
- Health endpoint at `/health`

## Requirements

- Node.js 18+
- Slack App (Bot Token + Signing Secret)
- Fivetran API Key and Secret

## Quick start

```bash
npm install
cp .env.example .env
# edit .env with your credentials
npm run validate
npm start
```

The app exposes Slack events at `/slack/events` and a health check at `/health`.

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

For local development, you can use ngrok:

```bash
npm start
ngrok http 3000
# Use https URL from ngrok for Slack Request URL
```

## Scripts

- `npm start` — run the server
- `npm run validate` — validate configuration
- `npm test` — run tests (does not require Slack/Fivetran)

## Testing

```bash
npm test
```

The tests run the server with Slack disabled using `SKIP_SLACK=1` and validate the health endpoint.

## Deployment

See `docs/DEPLOYMENT.md` for production notes.

## References

- Fivetran Connector SDK docs: [Connector SDK - Build Custom Connectors](https://fivetran.com/docs/connector-sdk)

## License

MIT



