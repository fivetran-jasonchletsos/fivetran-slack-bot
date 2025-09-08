# Deployment Guide

This guide covers deploying the Fivetran Slack Bot to production-like environments.

## Pre-requisites

- Node.js 18+ runtime
- Slack App (Bot token + Signing Secret)
- Fivetran API key/secret

## Environment variables

Set the variables documented in the project README. Minimal required set:

- `SLACK_SIGNING_SECRET`
- `SLACK_BOT_TOKEN`
- `FIVETRAN_API_KEY`
- `FIVETRAN_API_SECRET`
- `PORT` (optional, defaults to 3000)

## Production recommendations

- Run behind a public HTTPS endpoint (e.g., load balancer or reverse proxy)
- Enable process restarts (PM2, systemd) and health checks on `/health`
- Restrict inbound traffic to Slack egress IPs if possible
- Set `FIVETRAN_CONNECTOR_MAP` to friendlier names for your common connectors

## Example: Dockerfile (optional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/app.js"]
```

## Example: Heroku

- Set config vars via the dashboard or CLI
- `npm start` is the default start command
- Expose `/slack/events` and `/health`

## Verifying

- `curl https://your-app/health` should return a JSON object with `status`
- Test `/fivetran-status` and `/fivetran-sync` slash commands in Slack



