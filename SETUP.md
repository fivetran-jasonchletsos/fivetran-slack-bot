# Fivetran Slack Bot - Complete Setup Guide

This guide will walk you through setting up the Fivetran Slack Bot from scratch.

## Prerequisites

- Node.js 18+ installed
- A Slack workspace where you can create apps
- A Fivetran account with API access
- Git installed

## Step 1: Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/fivetran-slack-bot.git
cd fivetran-slack-bot

# Install dependencies
npm install

# Copy environment template
cp env.example .env
```

## Step 2: Configure Environment Variables

Edit the `.env` file with your credentials:

```bash
# Slack Configuration
SLACK_SIGNING_SECRET=your_slack_signing_secret_here
SLACK_BOT_TOKEN=xoxb-your_bot_token_here

# Optional: Socket Mode (set to 1 to enable, requires SLACK_APP_TOKEN)
SLACK_SOCKET_MODE=0
SLACK_APP_TOKEN=xapp-your_app_token_here

# Fivetran API Configuration
FIVETRAN_API_KEY=your_fivetran_api_key_here
FIVETRAN_API_SECRET=your_fivetran_api_secret_here
FIVETRAN_API_BASE=https://api.fivetran.com/v1

# Optional: Map friendly names to connector IDs
# Example: {"salesforce":"connector_123","hubspot":"connector_456"}
FIVETRAN_CONNECTOR_MAP={}

# Server Configuration
PORT=3000
NODE_ENV=development
```

## Step 3: Get Fivetran API Credentials

1. Log into your Fivetran account
2. Go to **Account Settings** → **API Keys**
3. Click **Create API Key**
4. Give it a name (e.g., "Slack Bot")
5. Copy the **API Key** and **API Secret**
6. Add them to your `.env` file

## Step 4: Create Slack App

### Option A: Use the Included Manifest (Recommended)

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From an app manifest**
3. Copy and paste the JSON from `slack-app-manifest.json`
4. Replace `YOUR-PUBLIC-URL` with your ngrok/production URL
5. Click **Create**
6. Install the app to your workspace
7. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
8. Copy the **Signing Secret**

### Option B: Manual Setup

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name: "Fivetran Bot"
4. Select your workspace
5. Go to **OAuth & Permissions**
6. Add these Bot Token Scopes:
   - `chat:write`
   - `commands`
7. Install the app to your workspace
8. Copy the **Bot User OAuth Token**
9. Go to **Basic Information** → copy the **Signing Secret**
10. Go to **Slash Commands** → create:
    - `/fivetran-status` → Request URL: `https://your-url/slack/events`
    - `/fivetran-sync` → Request URL: `https://your-url/slack/events`
11. Go to **Event Subscriptions**
    - Enable Events API
    - Request URL: `https://your-url/slack/events`
    - Subscribe to bot events: `app_mention`

### Option C: Socket Mode (No Public URL)

1. Use `slack-app-manifest-socket.json` instead
2. Enable Socket Mode in your app
3. Generate an App-Level Token with `connections:write`
4. Set `SLACK_SOCKET_MODE=1` in your `.env`

## Step 5: Test Your Setup

```bash
# Validate configuration
npm run validate

# Test integration (requires real credentials)
npm run test:integration

# Run unit tests
npm test
```

## Step 6: Start the Bot

### Local Development with ngrok

```bash
# Start the bot
npm start

# In another terminal, start ngrok
ngrok http 3000

# Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok.io)
# Update your Slack app's Request URLs with this URL
```

### Socket Mode (No ngrok needed)

```bash
# Set socket mode in .env
SLACK_SOCKET_MODE=1
SLACK_APP_TOKEN=xapp-your_app_token

# Start the bot
npm start
```

## Step 7: Test in Slack

Once your bot is running, test these commands in Slack:

- `/fivetran-help` - Show usage help
- `/fivetran-status all` - List all connectors
- `/fivetran-status <connector-id>` - Show specific connector
- `/fivetran-sync <connector-id>` - Trigger a sync

## Step 8: Deploy to Production

See `docs/DEPLOYMENT.md` for production deployment instructions.

## Troubleshooting

### Common Issues

1. **"Missing Fivetran credentials"**
   - Check your `.env` file has `FIVETRAN_API_KEY` and `FIVETRAN_API_SECRET`
   - Verify the credentials are correct in Fivetran dashboard

2. **"Slack signing secret verification failed"**
   - Check your `SLACK_SIGNING_SECRET` is correct
   - Ensure your ngrok URL is HTTPS

3. **"No connectors found"**
   - Verify your Fivetran account has connectors
   - Check API permissions include connector access

4. **Commands not working**
   - Ensure slash commands are properly configured in Slack app
   - Check the Request URL points to your bot's `/slack/events` endpoint

### Debug Mode

```bash
# Run with debug logging
DEBUG=* npm start
```

### Health Check

```bash
# Check if bot is running
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "connectors": 5
}
```

## Next Steps

- Set up connector aliases in `FIVETRAN_CONNECTOR_MAP`
- Configure monitoring and alerts
- Set up CI/CD pipeline
- Add custom connector mappings

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the logs with `DEBUG=* npm start`
3. Verify all environment variables are set correctly
4. Test the Fivetran API connection separately
