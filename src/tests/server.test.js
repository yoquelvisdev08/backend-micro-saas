const axios = require('axios');

// Basic test to ensure Jest is working
describe('Server', () => {
  it('should initialize correctly', () => {
    expect(true).toBeTruthy();
  });

  // Test deployed API on Railway
  it('should have a working deployed API', async () => {
    try {
      const response = await axios.get('https://web-production-8d975.up.railway.app/api/test');
      expect(response.status).toBe(200);
      expect(response.data).toBe('API funcionando correctamente con Appwrite!');
    } catch (error) {
      console.error('Error calling deployed API:', error.message);
      // Check if we got a response but with unexpected status
      if (error.response) {
        console.error('API Response:', error.response.status, error.response.data);
      }
      throw error;
    }
  });
}); 