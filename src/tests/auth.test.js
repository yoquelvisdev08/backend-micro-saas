const request = require('supertest');
const { connectTestDB, disconnectTestDB } = require('../config/db.test');
const User = require('../models/user.model');

// Create a separate Express app instance for testing
const express = require('express');
const cors = require('cors');
const authRoutes = require('../routes/auth.routes');

// Initialize test app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth', authRoutes);

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

// Before all tests, connect to the database
beforeAll(async () => {
  await connectTestDB();
});

// After each test, clear the User collection
afterEach(async () => {
  await User.deleteMany({});
});

// After all tests, close the connection
afterAll(async () => {
  await disconnectTestDB();
});

describe('Authentication', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user and return a token', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should not register a user with an existing email', async () => {
      // First create a user
      await User.create(testUser);

      // Try to register the same user again
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already in use');
    });

    it('should not register a user without required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          // Missing email and password
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login a user and return a token', async () => {
      // First register a user
      await User.create(testUser);

      // Login with the user
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should not login a user with incorrect credentials', async () => {
      // First register a user
      await User.create(testUser);

      // Login with wrong password
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user profile with a valid token', async () => {
      // First register a user
      const user = await User.create(testUser);
      const token = user.getSignedJwtToken();

      // Get user profile
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should not get profile without a token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
}); 