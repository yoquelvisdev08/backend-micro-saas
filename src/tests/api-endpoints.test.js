const axios = require('axios');

const API_URL = 'https://web-production-8d975.up.railway.app';

describe('Railway Deployed API Endpoints', () => {
  it('should have a working root endpoint', async () => {
    try {
      const response = await axios.get(`${API_URL}/`);
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    } catch (error) {
      console.error('Error calling API root:', error.message);
      if (error.response) {
        console.error('API Response:', error.response.status, error.response.data);
      }
      throw error;
    }
  });

  it('should have a working test endpoint', async () => {
    try {
      const response = await axios.get(`${API_URL}/api/test`);
      expect(response.status).toBe(200);
      expect(response.data).toBe('API funcionando correctamente con Appwrite!');
    } catch (error) {
      console.error('Error calling test endpoint:', error.message);
      if (error.response) {
        console.error('API Response:', error.response.status, error.response.data);
      }
      throw error;
    }
  });

  it('should have API documentation available', async () => {
    try {
      const response = await axios.get(`${API_URL}/api/docs/`);
      expect(response.status).toBe(200);
      expect(response.data).toContain('swagger-ui');
      expect(response.data).toContain('API Documentation');
    } catch (error) {
      console.error('Error calling API docs:', error.message);
      if (error.response) {
        console.error('API Response:', error.response.status, error.response.data);
      }
      throw error;
    }
  });
}); 