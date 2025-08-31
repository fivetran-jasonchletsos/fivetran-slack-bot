'use strict';

require('dotenv').config();

function checkEnvVar(name, options = {}) {
  const { required = true, validator } = options;
  const value = process.env[name];
  const exists = typeof value === 'string' && value.trim().length > 0;
  if (required && !exists) {
    return { name, ok: false, message: `${name} is required but missing` };
  }
  if (exists && typeof validator === 'function') {
    try {
      const valid = validator(value);
      if (!valid) return { name, ok: false, message: `${name} is invalid` };
    } catch (err) {
      return { name, ok: false, message: `${name} validation error: ${err.message}` };
    }
  }
  return { name, ok: true };
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch (err) {
    return null;
  }
}

function validate() {
  const results = [];

  results.push(checkEnvVar('PORT', { required: false, validator: (v) => !Number.isNaN(Number(v)) }));

  // Slack
  results.push(checkEnvVar('SLACK_SIGNING_SECRET'));
  results.push(checkEnvVar('SLACK_BOT_TOKEN'));
  const useSocket = (process.env.SLACK_SOCKET_MODE || '').toString().toLowerCase();
  const socketEnabled = useSocket === '1' || useSocket === 'true';
  if (socketEnabled) {
    results.push(checkEnvVar('SLACK_APP_TOKEN', { validator: (v) => v.startsWith('xapp-') }));
  }

  // Fivetran
  results.push(checkEnvVar('FIVETRAN_API_KEY'));
  results.push(checkEnvVar('FIVETRAN_API_SECRET'));
  results.push(checkEnvVar('FIVETRAN_API_BASE', { required: false }));

  // Connector map JSON
  results.push(checkEnvVar('FIVETRAN_CONNECTOR_MAP', {
    required: false,
    validator: (v) => {
      const parsed = parseJsonSafe(v);
      return parsed === null || typeof parsed === 'object';
    }
  }));

  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    // eslint-disable-next-line no-console
    console.log('✅ All configuration checks passed.');
    process.exit(0);
  } else {
    // eslint-disable-next-line no-console
    console.error('❌ Configuration errors:');
    for (const item of failed) {
      // eslint-disable-next-line no-console
      console.error(`- ${item.message}`);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  validate();
}

module.exports = { validate };



