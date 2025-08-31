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

function buildConnectorBlocks(connector) {
  const c = connector.data || connector;
  const status = c.status || {};
  const syncState = status.sync_state || status.setup_state || 'unknown';
  const lastSync = status.historical_sync_completed_at || status.last_sync_started_at || status.last_sync || 'n/a';
  const nextSync = status.next_sync || 'n/a';
  const stateEmoji = syncState === 'syncing' ? '🔄' : syncState === 'paused' ? '⏸️' : syncState === 'rescheduled' ? '⏭️' : '✅';

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${c.schema || c.service || c.id}* ${stateEmoji}\nID: \`${c.id}\``
      },
      fields: [
        { type: 'mrkdwn', text: `*State*\n${syncState}` },
        { type: 'mrkdwn', text: `*Service*\n${c.service || 'n/a'}` },
        { type: 'mrkdwn', text: `*Last*\n${lastSync}` },
        { type: 'mrkdwn', text: `*Next*\n${nextSync}` }
      ],
      accessory: {
        type: 'button',
        text: { type: 'plain_text', text: 'Trigger Sync' },
        action_id: 'trigger_sync',
        value: c.id
      }
    },
    { type: 'divider' }
  ];
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
  app.command('/fivetran-status', async ({ ack, say, respond, command }) => {
    await ack();
    const text = (command.text || '').trim();

    try {
      if (!process.env.FIVETRAN_API_KEY || !process.env.FIVETRAN_API_SECRET) {
        await respond({ response_type: 'ephemeral', text: 'Fivetran credentials are not configured.' });
        return;
      }

      if (!text || text.toLowerCase() === 'all') {
        const data = await listConnectors({ limit: 100 });
        const items = (data && data.data && Array.isArray(data.data.items)) ? data.data.items : [];
        if (items.length === 0) {
          await respond({ response_type: 'ephemeral', text: 'No connectors found.' });
          return;
        }
        const top = items.slice(0, 10);
        const blocks = [];
        for (const c of top) blocks.push(...buildConnectorBlocks(c));
        if (items.length > top.length) {
          blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: `…and ${items.length - top.length} more` }] });
        }
        await respond({ response_type: 'ephemeral', text: 'Fivetran connector statuses:', blocks });
        return;
      }

      const resolved = await resolveConnectorAlias(text);
      if (!resolved) {
        await respond({ response_type: 'ephemeral', text: `Could not find connector matching: ${text}` });
        return;
      }
      const data = await getConnector(resolved.id);
      const blocks = buildConnectorBlocks(data);
      await respond({ response_type: 'ephemeral', text: formatConnectorStatus(data), blocks });
    } catch (err) {
      await respond({ response_type: 'ephemeral', text: `Failed to fetch status: ${err.message}` });
    }
  });

  // Slash command: /fivetran-sync
  app.command('/fivetran-sync', async ({ ack, say, respond, command }) => {
    await ack();
    const text = (command.text || '').trim();

    if (!text) {
      await respond({ response_type: 'ephemeral', text: 'Usage: /fivetran-sync <connector-id or alias>' });
      return;
    }
    try {
      if (!process.env.FIVETRAN_API_KEY || !process.env.FIVETRAN_API_SECRET) {
        await respond({ response_type: 'ephemeral', text: 'Fivetran credentials are not configured.' });
        return;
      }
      const resolved = await resolveConnectorAlias(text);
      if (!resolved) {
        await respond({ response_type: 'ephemeral', text: `Could not find connector matching: ${text}` });
        return;
      }
      await forceSync(resolved.id);
      await respond({ response_type: 'ephemeral', text: `Triggered sync for connector: ${resolved.id}` });
    } catch (err) {
      await respond({ response_type: 'ephemeral', text: `Failed to trigger sync: ${err.message}` });
    }
  });

  // Help command
  app.command('/fivetran-help', async ({ ack, respond }) => {
    await ack();
    const text = [
      '*Fivetran Slack Bot*',
      '`/fivetran-status all` – list connectors (top 10) with buttons',
      '`/fivetran-status <id|schema|service>` – show one connector',
      '`/fivetran-sync <id|schema|service>` – trigger sync',
      'Aliases: tries ID, then schema, then service, then partial matches.'
    ].join('\n');
    await respond({ response_type: 'ephemeral', text });
  });

  // Interactive button: trigger sync
  app.action('trigger_sync', async ({ ack, respond, action }) => {
    await ack();
    try {
      const connectorId = action && action.value ? action.value : null;
      if (!connectorId) {
        await respond({ response_type: 'ephemeral', text: 'Missing connector id.' });
        return;
      }
      await forceSync(connectorId);
      await respond({ response_type: 'ephemeral', text: `Triggered sync for ${connectorId}` });
    } catch (err) {
      await respond({ response_type: 'ephemeral', text: `Failed to trigger sync: ${err.message}` });
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



