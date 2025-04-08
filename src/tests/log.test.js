const request = require('supertest');
const { connectTestDB, disconnectTestDB } = require('../config/db.test');
const User = require('../models/user.model');
const Log = require('../models/log.model');
const LogService = require('../services/log.service');

// Create a separate Express app instance for testing
const express = require('express');
const cors = require('cors');
const logRoutes = require('../routes/log.routes');

// Initialize test app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/logs', logRoutes);

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

// Variables to store the user and token for tests
let user;
let token;

// Before all tests, connect to the database and create a test user
beforeAll(async () => {
  await connectTestDB();
  user = await User.create(testUser);
  token = user.getSignedJwtToken();
  
  // Create some test logs
  await LogService.createLog({
    type: 'auth',
    action: 'login',
    message: 'User logged in',
    userId: user._id,
    metadata: { ip: '127.0.0.1' }
  });
  
  await LogService.createLog({
    type: 'site',
    action: 'create',
    message: 'User created a site',
    userId: user._id,
    metadata: { siteName: 'Test Site' }
  });
  
  await LogService.createLog({
    type: 'site',
    action: 'update',
    message: 'User updated a site',
    userId: user._id,
    metadata: { siteName: 'Updated Site' }
  });
});

// After all tests, clear the database and close the connection
afterAll(async () => {
  await User.deleteMany({});
  await Log.deleteMany({});
  await disconnectTestDB();
});

describe('Log System', () => {
  describe('GET /api/logs', () => {
    it('should get user logs with pagination', async () => {
      const response = await request(app)
        .get('/api/logs')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.logs).toBeDefined();
      expect(response.body.data.logs.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter logs by type', async () => {
      const response = await request(app)
        .get('/api/logs?type=site')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toBeDefined();
      expect(response.body.data.logs.length).toBeGreaterThan(0);
      
      // All logs should be of type 'site'
      const allSiteType = response.body.data.logs.every(log => log.type === 'site');
      expect(allSiteType).toBe(true);
    });

    it('should filter logs by action', async () => {
      const response = await request(app)
        .get('/api/logs?action=create')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toBeDefined();
      
      // All logs should have action 'create'
      const allCreateAction = response.body.data.logs.every(log => log.action === 'create');
      expect(allCreateAction).toBe(true);
    });

    it('should not allow access without authentication', async () => {
      const response = await request(app)
        .get('/api/logs');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Log Service', () => {
    it('should create a log entry', async () => {
      const logData = {
        type: 'system',
        action: 'other',
        message: 'Test log entry',
        userId: user._id
      };

      const log = await LogService.createLog(logData);
      
      expect(log).toBeDefined();
      expect(log.type).toBe(logData.type);
      expect(log.action).toBe(logData.action);
      expect(log.message).toBe(logData.message);
      expect(log.userId.toString()).toBe(user._id.toString());
    });

    it('should handle errors gracefully when creating logs', async () => {
      // Missing required field 'action'
      const invalidLogData = {
        type: 'system',
        // action is missing
        message: 'Invalid log entry',
        userId: user._id
      };

      const log = await LogService.createLog(invalidLogData);
      
      // Should return null instead of throwing an error
      expect(log).toBeNull();
    });
  });
}); 