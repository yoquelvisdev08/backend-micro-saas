const request = require('supertest');
const { connectTestDB, disconnectTestDB } = require('../config/db.test');
const User = require('../models/user.model');
const Site = require('../models/site.model');
const Log = require('../models/log.model');
const LogService = require('../services/log.service');

// Create a separate Express app instance for testing
const express = require('express');
const cors = require('cors');
const statsRoutes = require('../routes/stats.routes');

// Initialize test app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/stats', statsRoutes);

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

const testSite = {
  name: 'Test Site',
  url: 'https://example.com'
};

// Variables to store the user and token for tests
let user;
let token;
let site;

// Before all tests, connect to the database and create test data
beforeAll(async () => {
  await connectTestDB();
  
  // Create test user
  user = await User.create(testUser);
  token = user.getSignedJwtToken();
  
  // Create test site
  site = await Site.create({
    ...testSite,
    userId: user._id
  });
  
  // Create test logs with different dates for the last week
  const today = new Date();
  
  // Login logs
  await LogService.createLog({
    type: 'auth',
    action: 'login',
    message: 'User logged in today',
    userId: user._id,
    createdAt: today
  });
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  await LogService.createLog({
    type: 'auth',
    action: 'login',
    message: 'User logged in yesterday',
    userId: user._id,
    createdAt: yesterday
  });
  
  // Site-related logs
  await LogService.createLog({
    type: 'site',
    action: 'create',
    message: 'User created a site',
    userId: user._id,
    metadata: { siteId: site._id, siteName: site.name }
  });
  
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  await LogService.createLog({
    type: 'site',
    action: 'update',
    message: 'User updated a site',
    userId: user._id,
    metadata: { siteId: site._id, siteName: site.name },
    createdAt: threeDaysAgo
  });
  
  // System logs
  const fiveDaysAgo = new Date(today);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  
  await LogService.createLog({
    type: 'system',
    action: 'view',
    message: 'User viewed their logs',
    userId: user._id,
    createdAt: fiveDaysAgo
  });
});

// After all tests, clear the database and close the connection
afterAll(async () => {
  await User.deleteMany({});
  await Site.deleteMany({});
  await Log.deleteMany({});
  await disconnectTestDB();
});

describe('Statistics', () => {
  describe('GET /api/stats', () => {
    it('should return user statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toBeDefined();
      
      // Check if the stats contain the expected properties
      const { stats } = response.body.data;
      expect(stats.sites).toBeDefined();
      expect(stats.sites.total).toBe(1); // We created one site
      
      expect(stats.logs).toBeDefined();
      expect(stats.logs.total).toBeGreaterThan(0);
      
      expect(stats.user).toBeDefined();
      expect(stats.user.lastLogin).toBeDefined();
      
      expect(stats.activity).toBeDefined();
      expect(stats.activity.lastWeek).toBeDefined();
      expect(Array.isArray(stats.activity.lastWeek)).toBe(true);
      expect(stats.activity.lastWeek.length).toBe(7);  // 7 days
    });

    it('should not allow access to stats without authentication', async () => {
      const response = await request(app)
        .get('/api/stats');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/stats/activity', () => {
    it('should return activity distribution', async () => {
      const response = await request(app)
        .get('/api/stats/activity')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.distribution).toBeDefined();
      expect(Array.isArray(response.body.data.distribution)).toBe(true);
    });

    it('should group activities by type', async () => {
      const response = await request(app)
        .get('/api/stats/activity')
        .set('Authorization', `Bearer ${token}`);

      const { distribution } = response.body.data;
      
      // Check that distribution items have the right structure
      distribution.forEach(item => {
        expect(item._id).toBeDefined();        // Type (auth, site, system)
        expect(item.actions).toBeDefined();    // Array of actions with counts
        expect(item.total).toBeDefined();      // Total count for this type
        expect(Array.isArray(item.actions)).toBe(true);
      });
      
      // Verify we have entries for the types we created
      const types = distribution.map(item => item._id);
      expect(types).toContain('auth');
      expect(types).toContain('site');
    });
  });
}); 