'use strict';

const axios = require('axios');

function createFivetranClient(options = {}) {
  const baseURL = options.baseURL || process.env.FIVETRAN_API_BASE || 'https://api.fivetran.com/v1';
  const username = options.apiKey || process.env.FIVETRAN_API_KEY;
  const password = options.apiSecret || process.env.FIVETRAN_API_SECRET;

  if (!username || !password) {
    throw new Error('Missing Fivetran credentials. Set FIVETRAN_API_KEY and FIVETRAN_API_SECRET.');
  }

  const client = axios.create({
    baseURL,
    auth: { username, password },
    headers: { 'Content-Type': 'application/json' },
    timeout: 20000
  });

  return client;
}

async function listConnectors({ limit = 100, cursor } = {}, client) {
  const http = client || createFivetranClient();
  const params = { limit };
  if (cursor) params.cursor = cursor;
  const { data } = await http.get('/connectors', { params });
  return data;
}

async function getConnector(connectorId, client) {
  if (!connectorId) throw new Error('connectorId is required');
  const http = client || createFivetranClient();
  const { data } = await http.get(`/connectors/${encodeURIComponent(connectorId)}`);
  return data;
}

async function forceSync(connectorId, client) {
  if (!connectorId) throw new Error('connectorId is required');
  const http = client || createFivetranClient();
  const { data } = await http.post(`/connectors/${encodeURIComponent(connectorId)}/force`);
  return data;
}

function parseConnectorMapFromEnv() {
  const raw = process.env.FIVETRAN_CONNECTOR_MAP || '{}';
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return {};
  } catch (err) {
    return {};
  }
}

async function listAllConnectors(client) {
  const collected = [];
  let cursor;
  // Fivetran uses next_cursor for pagination
  // We request in pages until next_cursor is falsy or not present
  // Use a generous page size to reduce requests
  do {
    // eslint-disable-next-line no-await-in-loop
    const data = await listConnectors({ limit: 1000, cursor }, client);
    const items = data && data.data && Array.isArray(data.data.items) ? data.data.items : [];
    collected.push(...items);
    cursor = data && data.data ? data.data.next_cursor : undefined;
  } while (cursor);
  return collected;
}

function normalizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

async function resolveConnectorAlias(input, client) {
  if (!input) return null;
  const http = client || createFivetranClient();
  const map = parseConnectorMapFromEnv();
  const direct = map[input];
  if (direct) return { id: direct };

  const alias = normalizeString(input);
  // First, try direct fetch assuming it's an ID
  try {
    // Avoid throwing on 404; only treat success as a match
    const result = await getConnector(input, http);
    if (result && result.data && result.data.id) return { id: result.data.id };
  } catch (_) {
    // ignore
  }

  // Otherwise, scan connectors and match on id, schema, or service
  const connectors = await listAllConnectors(http);
  const exact = connectors.find((c) => {
    const id = normalizeString(c.id);
    const schema = normalizeString(c.schema);
    const service = normalizeString(c.service);
    return alias === id || alias === schema || alias === service;
  });
  if (exact) return { id: exact.id, connector: exact };

  // Try partial includes on schema or service
  const partial = connectors.find((c) => {
    const schema = normalizeString(c.schema);
    const service = normalizeString(c.service);
    return schema.includes(alias) || service.includes(alias);
  });
  if (partial) return { id: partial.id, connector: partial };

  return null;
}

module.exports = {
  createFivetranClient,
  listConnectors,
  listAllConnectors,
  getConnector,
  forceSync,
  parseConnectorMapFromEnv,
  resolveConnectorAlias
};




