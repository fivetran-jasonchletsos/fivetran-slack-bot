'use strict';

const request = require('supertest');

describe('Health endpoint', () => {
  let server;
  let app;

  beforeAll(async () => {
    process.env.SKIP_SLACK = '1';
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

  it('returns healthy or degraded', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(['healthy', 'degraded']).toContain(res.body.status);
    expect(res.body).toHaveProperty('timestamp');
  });
});


