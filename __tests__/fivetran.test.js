'use strict';

const {
  createFivetranClient,
  listConnectors,
  getConnector,
  forceSync,
  parseConnectorMapFromEnv,
  resolveConnectorAlias
} = require('../src/fivetran');

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn()
  }))
}));

describe('Fivetran Integration', () => {
  let mockClient;
  let mockAxios;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxios = require('axios');
    mockClient = mockAxios.create();
  });

  describe('createFivetranClient', () => {
    it('should create client with environment variables', () => {
      process.env.FIVETRAN_API_KEY = 'test_key';
      process.env.FIVETRAN_API_SECRET = 'test_secret';
      
      const client = createFivetranClient();
      
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.fivetran.com/v1',
        auth: { username: 'test_key', password: 'test_secret' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000
      });
    });

    it('should throw error when credentials are missing', () => {
      delete process.env.FIVETRAN_API_KEY;
      delete process.env.FIVETRAN_API_SECRET;
      
      expect(() => createFivetranClient()).toThrow('Missing Fivetran credentials');
    });

    it('should accept custom options', () => {
      const client = createFivetranClient({
        baseURL: 'https://custom.api.com',
        apiKey: 'custom_key',
        apiSecret: 'custom_secret'
      });
      
      expect(mockAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://custom.api.com',
        auth: { username: 'custom_key', password: 'custom_secret' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 20000
      });
    });
  });

  describe('listConnectors', () => {
    it('should call API with correct parameters', async () => {
      const mockResponse = { data: { data: { items: [] } } };
      mockClient.get.mockResolvedValue(mockResponse);
      
      await listConnectors({ limit: 50, cursor: 'test_cursor' }, mockClient);
      
      expect(mockClient.get).toHaveBeenCalledWith('/connectors', {
        params: { limit: 50, cursor: 'test_cursor' }
      });
    });

    it('should use default parameters when none provided', async () => {
      const mockResponse = { data: { data: { items: [] } } };
      mockClient.get.mockResolvedValue(mockResponse);
      
      await listConnectors({}, mockClient);
      
      expect(mockClient.get).toHaveBeenCalledWith('/connectors', {
        params: { limit: 100 }
      });
    });
  });

  describe('getConnector', () => {
    it('should call API with connector ID', async () => {
      const mockResponse = { data: { data: { id: 'test_id' } } };
      mockClient.get.mockResolvedValue(mockResponse);
      
      await getConnector('test_id', mockClient);
      
      expect(mockClient.get).toHaveBeenCalledWith('/connectors/test_id');
    });

    it('should throw error when connector ID is missing', async () => {
      await expect(getConnector(null, mockClient)).rejects.toThrow('connectorId is required');
    });
  });

  describe('forceSync', () => {
    it('should call API with connector ID', async () => {
      const mockResponse = { data: { data: { id: 'test_id' } } };
      mockClient.post.mockResolvedValue(mockResponse);
      
      await forceSync('test_id', mockClient);
      
      expect(mockClient.post).toHaveBeenCalledWith('/connectors/test_id/force');
    });

    it('should throw error when connector ID is missing', async () => {
      await expect(forceSync(null, mockClient)).rejects.toThrow('connectorId is required');
    });
  });

  describe('parseConnectorMapFromEnv', () => {
    it('should parse valid JSON', () => {
      process.env.FIVETRAN_CONNECTOR_MAP = '{"salesforce":"conn_123","hubspot":"conn_456"}';
      
      const result = parseConnectorMapFromEnv();
      
      expect(result).toEqual({
        salesforce: 'conn_123',
        hubspot: 'conn_456'
      });
    });

    it('should return empty object for invalid JSON', () => {
      process.env.FIVETRAN_CONNECTOR_MAP = 'invalid json';
      
      const result = parseConnectorMapFromEnv();
      
      expect(result).toEqual({});
    });

    it('should return empty object when not set', () => {
      delete process.env.FIVETRAN_CONNECTOR_MAP;
      
      const result = parseConnectorMapFromEnv();
      
      expect(result).toEqual({});
    });
  });

  describe('resolveConnectorAlias', () => {
    it('should return direct match from connector map', async () => {
      process.env.FIVETRAN_CONNECTOR_MAP = '{"salesforce":"conn_123"}';
      mockClient.get.mockRejectedValue(new Error('Not found'));
      
      const result = await resolveConnectorAlias('salesforce', mockClient);
      
      expect(result).toEqual({ id: 'conn_123' });
    });

    it('should return null for empty input', async () => {
      const result = await resolveConnectorAlias('', mockClient);
      expect(result).toBeNull();
    });

    it('should return null for empty input', async () => {
      const result = await resolveConnectorAlias('', mockClient);
      
      expect(result).toBeNull();
    });
  });
});
