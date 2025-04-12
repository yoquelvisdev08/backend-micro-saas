const { connectTestDB, disconnectTestDB } = require('../config/appwrite.test');
const authService = require('../services/auth.test.service');

// Test user data
const testUser = {
  name: 'Test User',
  email: 'test_appwrite@example.com',
  password: 'password123'
};

// Before all tests, connect to the database
beforeAll(async () => {
  await connectTestDB();
});

// After all tests, close the connection and clean up
afterAll(async () => {
  await authService.cleanup();
  await disconnectTestDB();
});

describe('Authentication with Appwrite', () => {
  it('should register a new user', async () => {
    const result = await authService.register(testUser);
    
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe(testUser.email);
    expect(result.user.name).toBe(testUser.name);
  });
  
  it('should login a user with valid credentials', async () => {
    const result = await authService.login(testUser.email, testUser.password);
    
    expect(result.user).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe(testUser.email);
  });
  
  it('should not login a user with invalid credentials', async () => {
    try {
      await authService.login(testUser.email, 'wrongpassword');
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toBe('Invalid credentials');
      expect(error.statusCode).toBe(401);
    }
  });
  
  it('should not register a user with an existing email', async () => {
    try {
      await authService.register(testUser);
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toBe('Email already in use');
      expect(error.statusCode).toBe(400);
    }
  });
}); 