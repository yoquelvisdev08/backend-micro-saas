const request = require('supertest');
const { connectTestDB, disconnectTestDB } = require('../config/db.test');
const User = require('../models/user.model');

// Create a separate Express app instance for testing
const express = require('express');
const cors = require('cors');
const adminRoutes = require('../routes/admin.routes');

// Initialize test app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/admin', adminRoutes);

// Test data
const adminUser = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'password123',
  role: 'admin'
};

const regularUser = {
  name: 'Regular User',
  email: 'user@example.com',
  password: 'password123',
  role: 'user'
};

// Variables to store users and tokens for tests
let admin;
let user;
let adminToken;
let userToken;

// Before all tests, connect to the database and create test users
beforeAll(async () => {
  await connectTestDB();
  
  // Create test users
  admin = await User.create(adminUser);
  user = await User.create(regularUser);
  
  // Generate tokens
  adminToken = admin.getSignedJwtToken();
  userToken = user.getSignedJwtToken();
});

// After all tests, clear the database and close the connection
afterAll(async () => {
  await User.deleteMany({});
  await disconnectTestDB();
});

describe('Admin Routes and Role Middleware', () => {
  describe('Role-based Access Control', () => {
    it('should allow admins to access admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
    });

    it('should deny access to regular users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should deny access to unauthenticated requests', async () => {
      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('User Management', () => {
    it('should allow admin to view a specific user', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toBeDefined();
      expect(response.body.data.user._id.toString()).toBe(user._id.toString());
    });

    it('should allow admin to update user role', async () => {
      // Create a test user to update
      const testUser = await User.create({
        name: 'Role Test User',
        email: 'roletest@example.com',
        password: 'password123',
        role: 'user'
      });

      const response = await request(app)
        .put(`/api/admin/users/${testUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('admin');

      // Clean up
      await User.findByIdAndDelete(testUser._id);
    });

    it('should prevent admin from changing their own role', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${admin._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'user' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should allow admin to delete a user', async () => {
      // Create a test user to delete
      const deleteUser = await User.create({
        name: 'Delete Test User',
        email: 'deletetest@example.com',
        password: 'password123'
      });

      const response = await request(app)
        .delete(`/api/admin/users/${deleteUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify user was deleted
      const deletedUser = await User.findById(deleteUser._id);
      expect(deletedUser).toBeNull();
    });

    it('should prevent admin from deleting their own account', async () => {
      const response = await request(app)
        .delete(`/api/admin/users/${admin._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
}); 