const request = require('supertest');
const { connectTestDB, disconnectTestDB } = require('../config/db.test');
const User = require('../models/user.model');
const Site = require('../models/site.model');

// Create a separate Express app instance for testing
const express = require('express');
const cors = require('cors');
const siteRoutes = require('../routes/site.routes');

// Initialize test app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/sites', siteRoutes);

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
let createdSite;

// Before all tests, connect to the database and create a test user
beforeAll(async () => {
  await connectTestDB();
  user = await User.create(testUser);
  token = user.getSignedJwtToken();
});

// After all tests, clear the database and close the connection
afterAll(async () => {
  await User.deleteMany({});
  await Site.deleteMany({});
  await disconnectTestDB();
});

describe('Site Management', () => {
  describe('POST /api/sites', () => {
    it('should create a new site', async () => {
      const response = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${token}`)
        .send(testSite);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.site).toBeDefined();
      expect(response.body.data.site.name).toBe(testSite.name);
      expect(response.body.data.site.url).toBe(testSite.url);
      expect(response.body.data.site.userId.toString()).toBe(user._id.toString());

      // Save the created site for later tests
      createdSite = response.body.data.site;
    });

    it('should not create a site with missing fields', async () => {
      const response = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test Site' }); // Missing URL

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not create a duplicate site for the same user', async () => {
      const response = await request(app)
        .post('/api/sites')
        .set('Authorization', `Bearer ${token}`)
        .send(testSite); // Same URL as before

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sites', () => {
    it('should get all sites for a user', async () => {
      const response = await request(app)
        .get('/api/sites')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sites).toBeDefined();
      expect(response.body.data.sites.length).toBeGreaterThan(0);
    });

    it('should not get sites without authentication', async () => {
      const response = await request(app)
        .get('/api/sites');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/sites/:id', () => {
    it('should get a single site by ID', async () => {
      const response = await request(app)
        .get(`/api/sites/${createdSite._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.site).toBeDefined();
      expect(response.body.data.site._id).toBe(createdSite._id);
    });

    it('should not get a site with invalid ID', async () => {
      const response = await request(app)
        .get('/api/sites/invalidid')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(500); // MongoDB error for invalid ObjectId
    });
  });

  describe('PUT /api/sites/:id', () => {
    it('should update a site', async () => {
      const updatedSiteData = {
        name: 'Updated Site',
        url: 'https://updated-example.com'
      };

      const response = await request(app)
        .put(`/api/sites/${createdSite._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updatedSiteData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.site).toBeDefined();
      expect(response.body.data.site.name).toBe(updatedSiteData.name);
      expect(response.body.data.site.url).toBe(updatedSiteData.url);
    });

    it('should not update a site with invalid data', async () => {
      const response = await request(app)
        .put(`/api/sites/${createdSite._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ url: 'invalid-url' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/sites/:id', () => {
    it('should delete a site', async () => {
      const response = await request(app)
        .delete(`/api/sites/${createdSite._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not find the deleted site', async () => {
      const response = await request(app)
        .get(`/api/sites/${createdSite._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });
}); 