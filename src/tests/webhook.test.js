const request = require('supertest');
const nock = require('nock');
const { connectTestDB, disconnectTestDB } = require('../config/db.test');
const User = require('../models/user.model');
const WebhookService = require('../services/webhook.service');
const LogService = require('../services/log.service');

// Create a separate Express app instance for testing
const express = require('express');
const cors = require('cors');
const userRoutes = require('../routes/user.routes');

// Initialize test app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/users', userRoutes);

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

// Test webhook URL
const TEST_WEBHOOK_URL = 'https://webhook.example.com/endpoint';

// Variables to store the user and token for tests
let user;
let token;

// Before all tests, connect to the database and create a test user
beforeAll(async () => {
  await connectTestDB();
  user = await User.create(testUser);
  token = user.getSignedJwtToken();
});

// After all tests, clear the database and close the connection
afterAll(async () => {
  await User.deleteMany({});
  await disconnectTestDB();
  
  // Make sure nock is clean after all tests
  nock.cleanAll();
  nock.restore();
});

describe('Webhook System', () => {
  describe('WebhookService', () => {
    it('should return null when user has no webhook URL', async () => {
      // Setup user with no webhook URL
      const userWithoutWebhook = await User.create({
        name: 'No Webhook User',
        email: 'no-webhook@example.com',
        password: 'password123'
      });

      const result = await WebhookService.sendWebhook(userWithoutWebhook._id, {
        event: 'test'
      });

      expect(result).toBeNull();
      
      // Clean up
      await User.findByIdAndDelete(userWithoutWebhook._id);
    });
    
    it('should handle errors when testing invalid webhooks', async () => {
      const result = await WebhookService.testWebhook('https://invalid-domain-that-does-not-exist.xyz');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('User Webhook Routes', () => {
    beforeEach(() => {
      // Mock the webhook test endpoint with a wide matcher (any body)
      nock('https://webhook.example.com')
        .post('/endpoint')
        .reply(200, { status: 'success' });
    });

    afterEach(() => {
      // Ensure nock is clean after each test
      nock.cleanAll();
    });

    it('should update user webhook URL', async () => {
      // Mock the webhook test that happens during update
      nock('https://webhook.example.com')
        .post('/endpoint')
        .reply(200, { status: 'success' });

      const response = await request(app)
        .put('/api/users/webhook')
        .set('Authorization', `Bearer ${token}`)
        .send({ webhookUrl: TEST_WEBHOOK_URL });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.webhookUrl).toBe(TEST_WEBHOOK_URL);

      // Verify the user was updated in the database
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.webhookUrl).toBe(TEST_WEBHOOK_URL);
    });

    it('should not accept invalid webhook URLs', async () => {
      const response = await request(app)
        .put('/api/users/webhook')
        .set('Authorization', `Bearer ${token}`)
        .send({ webhookUrl: 'not-a-valid-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should test a webhook', async () => {
      // First ensure user has a webhook URL
      await User.findByIdAndUpdate(user._id, { webhookUrl: TEST_WEBHOOK_URL });

      // Setup mock for test request
      nock('https://webhook.example.com')
        .post('/endpoint')
        .reply(200, { status: 'success' });

      const response = await request(app)
        .post('/api/users/webhook/test')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should delete webhook URL', async () => {
      // First ensure user has a webhook URL
      await User.findByIdAndUpdate(user._id, { webhookUrl: TEST_WEBHOOK_URL });

      const response = await request(app)
        .delete('/api/users/webhook')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify the webhook was removed
      const updatedUser = await User.findById(user._id);
      expect(updatedUser.webhookUrl).toBeNull();
    });
  });

  describe('Log Service with Webhooks', () => {
    beforeEach(async () => {
      // Make sure nock is clean
      nock.cleanAll();
      
      // Mock ANY POST request to webhook URL
      nock('https://webhook.example.com')
        .post('/endpoint')
        .reply(200, { status: 'success' });

      // Update user with webhook URL
      await User.findByIdAndUpdate(user._id, { webhookUrl: TEST_WEBHOOK_URL });
    });

    afterEach(() => {
      nock.cleanAll();
    });

    it('should successfully create a log with test type', async () => {
      // Create a test log
      const log = await LogService.createLog({
        type: 'test',
        action: 'other',
        message: 'Testing webhook notification',
        userId: user._id
      });

      expect(log).toBeDefined();
      expect(log.type).toBe('test');
      expect(log.message).toBe('Testing webhook notification');
      
      // Note: We don't test the webhook delivery directly because it's sent asynchronously
      // In a production environment, we would use a proper mocking approach or message queue
    });
  });
}); 