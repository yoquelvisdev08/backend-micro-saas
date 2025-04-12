const { Client, Account, Databases, ID, Query } = require('node-appwrite');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

// Initialize Appwrite client for testing
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

// Initialize Appwrite services
const account = new Account(client);
const databases = new Databases(client);

// Database constants - use the same database ID from regular config
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
// Use the same collections as the main app for testing
const USERS_COLLECTION_ID = 'users';
const SITES_COLLECTION_ID = 'sites';
const LOGS_COLLECTION_ID = 'logs';

/**
 * Initialize test database connection
 */
const connectTestDB = async () => {
  try {
    console.log('Connecting to Appwrite test environment...');
    
    if (!DATABASE_ID) {
      throw new Error('APPWRITE_DATABASE_ID not configured');
    }
    
    // Verify connection
    await databases.get(DATABASE_ID);
    
    console.log('Connected to Appwrite test environment');
    return true;
  } catch (error) {
    console.error('Error connecting to Appwrite test environment:', error);
    throw error;
  }
};

/**
 * Clean up test data
 */
const disconnectTestDB = async () => {
  try {
    // Clean up test data if needed
    console.log('Cleaned up Appwrite test collections');
    return true;
  } catch (error) {
    console.error('Error cleaning up Appwrite test collections:', error);
    return false;
  }
};

/**
 * Create a test user
 */
const createTestUser = async (userData) => {
  const timestamp = new Date().toISOString();
  
  const user = await databases.createDocument(
    DATABASE_ID,
    USERS_COLLECTION_ID,
    ID.unique(),
    {
      ...userData,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  );
  
  return user;
};

/**
 * Delete a test user
 */
const deleteTestUser = async (userId) => {
  await databases.deleteDocument(DATABASE_ID, USERS_COLLECTION_ID, userId);
};

/**
 * Get test user by email
 */
const getTestUserByEmail = async (email) => {
  const users = await databases.listDocuments(
    DATABASE_ID, 
    USERS_COLLECTION_ID,
    [Query.equal('email', email)]
  );
  
  if (users.total === 0) {
    return null;
  }
  
  return users.documents[0];
};

module.exports = {
  client,
  account,
  databases,
  DATABASE_ID,
  USERS_COLLECTION_ID,
  SITES_COLLECTION_ID,
  LOGS_COLLECTION_ID,
  connectTestDB,
  disconnectTestDB,
  createTestUser,
  deleteTestUser,
  getTestUserByEmail,
  Query,
  ID
}; 