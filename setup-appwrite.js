/**
 * Appwrite Setup Script
 * This script initializes an Appwrite database with required collections
 * Set up the .env file before running this script
 */

require('dotenv').config();
const { Client, Databases, ID } = require('node-appwrite');

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

// Constants
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const USERS_COLLECTION_ID = 'users';
const SITES_COLLECTION_ID = 'sites';
const LOGS_COLLECTION_ID = 'logs';

/**
 * Main function to set up Appwrite collections
 */
async function setupAppwrite() {
  console.log('Setting up Appwrite...');
  
  try {
    // Get database to verify it exists
    await databases.get(DATABASE_ID);
    console.log(`Database ${DATABASE_ID} exists, continuing with collection setup`);
  } catch (error) {
    console.error('Database does not exist. Please create a database first via the Appwrite console.');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  
  // Create collections
  await createUsersCollection();
  await createSitesCollection();
  await createLogsCollection();
  
  console.log('Appwrite setup completed successfully!');
}

/**
 * Create users collection
 */
async function createUsersCollection() {
  try {
    // Check if users collection already exists
    try {
      await databases.getCollection(DATABASE_ID, USERS_COLLECTION_ID);
      console.log('Users collection already exists');
      return;
    } catch (error) {
      // Collection doesn't exist, continue to create it
    }
    
    // Create users collection
    await databases.createCollection(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'Users'
    );
    
    console.log('Users collection created');
    
    // Create attributes for users collection
    await databases.createStringAttribute(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'name',
      255,
      true // Required
    );
    
    await databases.createEmailAttribute(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'email',
      true, // Required
      null, // No default
      true // Unique
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'password',
      255,
      true // Required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'role',
      50,
      false, // Not required
      'user' // Default value
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'plan',
      50,
      false, // Not required
      'free' // Default value
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'webhookUrl',
      255,
      false // Not required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'createdAt',
      255,
      true // Required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      'updatedAt',
      255,
      true // Required
    );
    
    console.log('Users collection attributes created');
    
  } catch (error) {
    console.error('Error creating users collection:', error);
    throw error;
  }
}

/**
 * Create sites collection
 */
async function createSitesCollection() {
  try {
    // Check if sites collection already exists
    try {
      await databases.getCollection(DATABASE_ID, SITES_COLLECTION_ID);
      console.log('Sites collection already exists');
      return;
    } catch (error) {
      // Collection doesn't exist, continue to create it
    }
    
    // Create sites collection
    await databases.createCollection(
      DATABASE_ID,
      SITES_COLLECTION_ID,
      'Sites'
    );
    
    console.log('Sites collection created');
    
    // Create attributes for sites collection
    await databases.createStringAttribute(
      DATABASE_ID,
      SITES_COLLECTION_ID,
      'name',
      255,
      true // Required
    );
    
    await databases.createUrlAttribute(
      DATABASE_ID,
      SITES_COLLECTION_ID,
      'url',
      true // Required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      SITES_COLLECTION_ID,
      'userId',
      255,
      true // Required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      SITES_COLLECTION_ID,
      'status',
      50,
      false, // Not required
      'active' // Default value
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      SITES_COLLECTION_ID,
      'createdAt',
      255,
      true // Required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      SITES_COLLECTION_ID,
      'updatedAt',
      255,
      true // Required
    );
    
    console.log('Sites collection attributes created');
    
  } catch (error) {
    console.error('Error creating sites collection:', error);
    throw error;
  }
}

/**
 * Create logs collection
 */
async function createLogsCollection() {
  try {
    // Check if logs collection already exists
    try {
      await databases.getCollection(DATABASE_ID, LOGS_COLLECTION_ID);
      console.log('Logs collection already exists');
      return;
    } catch (error) {
      // Collection doesn't exist, continue to create it
    }
    
    // Create logs collection
    await databases.createCollection(
      DATABASE_ID,
      LOGS_COLLECTION_ID,
      'Logs'
    );
    
    console.log('Logs collection created');
    
    // Create attributes for logs collection
    await databases.createStringAttribute(
      DATABASE_ID,
      LOGS_COLLECTION_ID,
      'type',
      50,
      true // Required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      LOGS_COLLECTION_ID,
      'action',
      50,
      true // Required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      LOGS_COLLECTION_ID,
      'message',
      500,
      true // Required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      LOGS_COLLECTION_ID,
      'userId',
      255,
      true // Required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      LOGS_COLLECTION_ID,
      'metadata',
      1000,
      false // Not required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      LOGS_COLLECTION_ID,
      'ip',
      50,
      false // Not required
    );
    
    await databases.createStringAttribute(
      DATABASE_ID,
      LOGS_COLLECTION_ID,
      'createdAt',
      255,
      true // Required
    );
    
    console.log('Logs collection attributes created');
    
  } catch (error) {
    console.error('Error creating logs collection:', error);
    throw error;
  }
}

// Run the setup
setupAppwrite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error during setup:', err);
    process.exit(1);
  }); 