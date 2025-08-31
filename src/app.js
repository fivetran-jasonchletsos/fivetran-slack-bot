'use strict';

require('dotenv').config();
const express = require('express');
const { App, ExpressReceiver } = require('@slack/bolt');
const {
  listConnectors,
  getConnector,
  forceSync,
  parseConnectorMapFromEnv,
  createFivetranClient,
  resolveConnectorAlias
} = require('./fivetran');

const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

function formatConnectorStatus(item) {
  const c = item.data || item; // support both list item and single fetch shape
  const status = c.status || {};
  const syncState = status.sync_state || status.setup_state || 'unknown';
  const lastSync = status.historical_sync_completed_at || status.last_sync_started_at || status.last_sync || 'n/a';
  const nextSync = status.next_sync || 'n/a';
  return `• ${c.schema || c.service || c.id}: state=${syncState}, last=${lastSync}, next=${nextSync}`;
}

async function buildHealthPayload() {
  try {
    // Attempt a lightweight Fivetran call if creds exist
    if (process.env.FIVETRAN_API_KEY && process.env.FIVETRAN_API_SECRET) {
      const client = createFivetranClient();
      const data = await listConnectors({ limit: 1 }, client);
      const total = (data && data.data && typeof data.data.total_items === 'number')
        ? data.data.total_items
        : (data && data.data && Array.isArray(data.data.items)) ? data.data.items.length : null;
      return { status: 'healthy', timestamp: new Date().toISOString(), connectors: total };
    }
    return { status: 'healthy', timestamp: new Date().toISOString(), connectors: null };
  } catch (err) {
    return { status: 'degraded', timestamp: new Date().toISOString(), error: err.message };
  }
}

async function createServer(options = {}) {
  const skipSlack = options.skipSlack || process.env.SKIP_SLACK === '1';

  if (skipSlack || !process.env.SLACK_SIGNING_SECRET || !process.env.SLACK_BOT_TOKEN) {
    // Bare Express app with just health route, useful for tests or no Slack config yet
    const app = express();
    app.get('/health', async (req, res) => {
      const payload = await buildHealthPayload();
      res.json(payload);
    });
    return { expressApp: app, start: (port = DEFAULT_PORT) => app.listen(port) };
  }

  const receiver = new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    endpoints: '/slack/events'
  });

  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    receiver
  });

  // Health route
  receiver.app.get('/health', async (req, res) => {
    const payload = await buildHealthPayload();
    res.json(payload);
  });

  // Slash command: /fivetran-status
  app.command('/fivetran-status', async ({ ack, say, command }) => {
    await ack();
    const text = (command.text || '').trim();

    try {
      if (!process.env.FIVETRAN_API_KEY || !process.env.FIVETRAN_API_SECRET) {
        await say('Fivetran credentials are not configured.');
        return;
      }

      if (!text || text.toLowerCase() === 'all') {
        const data = await listConnectors({ limit: 100 });
        const items = (data && data.data && Array.isArray(data.data.items)) ? data.data.items : [];
        if (items.length === 0) {
          await say('No connectors found.');
          return;
        }
        const lines = items.slice(0, 20).map(formatConnectorStatus); // limit to avoid very long messages
        if (items.length > 20) lines.push(`…and ${items.length - 20} more`);
        await say(['Fivetran connector statuses:', ...lines].join('\n'));
        return;
      }

      const resolved = await resolveConnectorAlias(text);
      if (!resolved) {
        await say(`Could not find connector matching: ${text}`);
        return;
      }
      const data = await getConnector(resolved.id);
      await say(formatConnectorStatus(data));
    } catch (err) {
      await say(`Failed to fetch status: ${err.message}`);
    }
  });

  // Slash command: /fivetran-sync
  app.command('/fivetran-sync', async ({ ack, say, command }) => {
    await ack();
    const text = (command.text || '').trim();

    if (!text) {
      await say('Usage: /fivetran-sync <connector-id or alias>');
      return;
    }
    try {
      if (!process.env.FIVETRAN_API_KEY || !process.env.FIVETRAN_API_SECRET) {
        await say('Fivetran credentials are not configured.');
        return;
      }
      const resolved = await resolveConnectorAlias(text);
      if (!resolved) {
        await say(`Could not find connector matching: ${text}`);
        return;
      }
      await forceSync(resolved.id);
      await say(`Triggered sync for connector: ${resolved.id}`);
    } catch (err) {
      await say(`Failed to trigger sync: ${err.message}`);
    }
  });

  return {
    expressApp: receiver.app,
    start: async (port = DEFAULT_PORT) => {
      await app.start(port);
      // eslint-disable-next-line no-console
      console.log(`⚡️ Fivetran Slack Bot is running on port ${port}!`);
      return app;
    }
  };
}

// If executed directly, start the server
if (require.main === module) {
  (async () => {
    const { start } = await createServer();
    await start(DEFAULT_PORT);
  })();
}

module.exports = { createServer };



