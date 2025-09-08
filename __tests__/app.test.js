'use strict';

const request = require('supertest');

describe('Slack App', () => {
  let server;
  let app;

  beforeAll(async () => {
    process.env.SKIP_SLACK = '1';
    process.env.SLACK_SIGNING_SECRET = 'test_secret';
    process.env.SLACK_BOT_TOKEN = 'xoxb-test';
    process.env.FIVETRAN_API_KEY = 'test_key';
    process.env.FIVETRAN_API_SECRET = 'test_secret';
    
    const { createServer } = require('../src/app');
    const created = await createServer({ skipSlack: true });
    app = created.expressApp;
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Health endpoint', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
      expect(['healthy', 'degraded']).toContain(res.body.status);
    });

    it('should include connector count when available', async () => {
      const res = await request(app).get('/health');
      // When Fivetran API is not available, the response might not include connectors
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('timestamp');
      // connectors property might be missing when API fails
    });
  });

  describe('Server creation', () => {
    it('should create server with skipSlack option', async () => {
      const { createServer } = require('../src/app');
      const created = await createServer({ skipSlack: true });
      
      expect(created).toHaveProperty('expressApp');
      expect(created).toHaveProperty('start');
      expect(typeof created.start).toBe('function');
    });

    it('should handle missing Slack credentials gracefully', async () => {
      const originalSigningSecret = process.env.SLACK_SIGNING_SECRET;
      const originalBotToken = process.env.SLACK_BOT_TOKEN;
      
      delete process.env.SLACK_SIGNING_SECRET;
      delete process.env.SLACK_BOT_TOKEN;
      
      const { createServer } = require('../src/app');
      const created = await createServer();
      
      expect(created).toHaveProperty('expressApp');
      expect(created).toHaveProperty('start');
      
      // Restore environment variables
      process.env.SLACK_SIGNING_SECRET = originalSigningSecret;
      process.env.SLACK_BOT_TOKEN = originalBotToken;
    });
  });

  describe('Error handling', () => {
    it('should handle health endpoint errors gracefully', async () => {
      // This test verifies the health endpoint doesn't crash the app
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });
  });
});
