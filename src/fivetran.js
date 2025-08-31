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

module.exports = {
  createFivetranClient,
  listConnectors,
  getConnector,
  forceSync,
  parseConnectorMapFromEnv
};



