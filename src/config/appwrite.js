const { Client, Account, Databases, ID, Query, Permission, Role } = require('node-appwrite');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

// Log important configuration for debugging
console.log('=========== Appwrite Configuration ===========');
console.log(`APPWRITE_PROJECT_ID: ${process.env.APPWRITE_PROJECT_ID}`);
console.log(`APPWRITE_DATABASE_ID: ${process.env.APPWRITE_DATABASE_ID}`);
console.log(`APPWRITE_API_KEY: ${process.env.APPWRITE_API_KEY ? (process.env.APPWRITE_API_KEY.substring(0, 10) + '...') : 'FALTA'}`);
console.log('=============================================');

// Initialize Appwrite client
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

// Initialize Appwrite services
const account = new Account(client);
const databases = new Databases(client);

// Database constants
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
console.log(`DATABASE_ID value used in the code: ${DATABASE_ID}`);

const USERS_COLLECTION_ID = 'users';
const SITES_COLLECTION_ID = 'sites';
const LOGS_COLLECTION_ID = 'logs';

/**
 * Verifies if a collection has all required attributes
 * @param {string} collectionId - Collection ID to check
 * @param {Array} requiredAttributes - Array of attribute objects
 */
async function verifyCollectionAttributes(collectionId, requiredAttributes) {
  try {
    console.log(`Verifying attributes for collection: ${collectionId}`);
    
    // Get the collection attributes
    const attributes = await databases.listAttributes(DATABASE_ID, collectionId);
    console.log(`Found ${attributes.total} attributes in collection ${collectionId}`);
    
    // Get the names of existing attributes
    const existingAttributes = attributes.attributes.map(attr => attr.key);
    console.log(`Existing attributes: ${existingAttributes.join(', ')}`);
    
    // Check for missing attributes
    for (const attr of requiredAttributes) {
      if (!existingAttributes.includes(attr.key)) {
        console.log(`Missing attribute: ${attr.key} in collection ${collectionId}, creating it now...`);
        
        // Create the missing attribute based on its type
        switch (attr.type) {
          case 'string':
            await databases.createStringAttribute(
              DATABASE_ID,
              collectionId,
              attr.key,
              attr.size || 255,
              attr.required || false,
              attr.default || null,
              attr.array || false
            );
            break;
          case 'boolean':
            await databases.createBooleanAttribute(
              DATABASE_ID,
              collectionId,
              attr.key,
              attr.required || false,
              attr.default || null,
              attr.array || false
            );
            break;
          case 'integer':
            await databases.createIntegerAttribute(
              DATABASE_ID,
              collectionId,
              attr.key,
              attr.required || false,
              attr.min || null,
              attr.max || null,
              attr.default || null,
              attr.array || false
            );
            break;
          case 'datetime':
            await databases.createDatetimeAttribute(
              DATABASE_ID,
              collectionId,
              attr.key,
              attr.required || false,
              attr.default || null,
              attr.array || false
            );
            break;
          default:
            console.log(`Unknown attribute type: ${attr.type}`);
        }
        
        console.log(`Created attribute: ${attr.key} in collection ${collectionId}`);
      }
    }
    
    console.log(`All required attributes verified for collection: ${collectionId}`);
    return true;
  } catch (error) {
    console.error(`Error verifying attributes for collection ${collectionId}:`, error);
    return false;
  }
}

/**
 * Creates the database and collections if they don't exist
 */
const initializeDatabase = async () => {
  try {
    console.log('Initializing Appwrite database...');
    
    if (!DATABASE_ID) {
      console.error('ERROR: APPWRITE_DATABASE_ID no está configurado en el archivo .env');
      throw new Error('APPWRITE_DATABASE_ID no está configurado');
    }
    
    if (!process.env.APPWRITE_PROJECT_ID) {
      console.error('ERROR: APPWRITE_PROJECT_ID no está configurado en el archivo .env');
      throw new Error('APPWRITE_PROJECT_ID no está configurado');
    }
    
    if (!process.env.APPWRITE_API_KEY) {
      console.error('ERROR: APPWRITE_API_KEY no está configurado en el archivo .env');
      throw new Error('APPWRITE_API_KEY no está configurado');
    }
    
    // Check if we can connect to the database
    try {
      console.log(`Intentando conectar a la base de datos con ID: ${DATABASE_ID}`);
      const result = await databases.get(DATABASE_ID);
      console.log(`Conectado a la base de datos Appwrite: ${result.name} (${DATABASE_ID})`);
      
      // Verify required collections exist
      const collections = await databases.listCollections(DATABASE_ID);
      const collectionIds = collections.collections.map(c => c.$id);
      console.log(`Existing collections: ${collectionIds.join(', ')}`);

      // Verify users collection has all required attributes
      const userAttributes = [
        { key: 'name', type: 'string', size: 255, required: true },
        { key: 'email', type: 'string', size: 255, required: true },
        { key: 'password', type: 'string', size: 1024, required: true },
        { key: 'createdAt', type: 'datetime', required: true }
      ];
      
      // Verify logs collection has all required attributes
      const logAttributes = [
        { key: 'type', type: 'string', size: 255, required: true },
        { key: 'action', type: 'string', size: 255, required: true },
        { key: 'message', type: 'string', size: 1024, required: false },
        { key: 'userId', type: 'string', size: 255, required: true },
        { key: 'metadata', type: 'string', size: 2048, required: false },
        { key: 'ip', type: 'string', size: 255, required: false },
        { key: 'createdAt', type: 'datetime', required: true }
      ];
      
      // Verify sites collection has all required attributes
      const siteAttributes = [
        { key: 'name', type: 'string', size: 255, required: true },
        { key: 'url', type: 'string', size: 1024, required: true },
        { key: 'userId', type: 'string', size: 255, required: true },
        { key: 'status', type: 'string', size: 255, required: true },
        { key: 'createdAt', type: 'datetime', required: true }
      ];
      
      // Verify collections exist and have all required attributes
      if (collectionIds.includes(USERS_COLLECTION_ID)) {
        await verifyCollectionAttributes(USERS_COLLECTION_ID, userAttributes);
      } else {
        console.log(`Collection ${USERS_COLLECTION_ID} does not exist. Please create it manually.`);
      }
      
      if (collectionIds.includes(LOGS_COLLECTION_ID)) {
        await verifyCollectionAttributes(LOGS_COLLECTION_ID, logAttributes);
      } else {
        console.log(`Collection ${LOGS_COLLECTION_ID} does not exist. Please create it manually.`);
      }
      
      if (collectionIds.includes(SITES_COLLECTION_ID)) {
        await verifyCollectionAttributes(SITES_COLLECTION_ID, siteAttributes);
      } else {
        console.log(`Collection ${SITES_COLLECTION_ID} does not exist. Please create it manually.`);
      }
      
      return true;
    } catch (error) {
      console.error('Error conectando a la base de datos Appwrite:', error);
      console.error('Código de error:', error.code);
      console.error('Mensaje de error:', error.message);
      console.error('Tipo de error:', error.type);
      
      // Intenta listar las bases de datos para verificar los permisos
      try {
        console.log('Intentando listar todas las bases de datos...');
        const allDatabases = await databases.list();
        console.log(`Bases de datos disponibles: ${allDatabases.total}`);
        allDatabases.databases.forEach(db => {
          console.log(`- ${db.name} (${db.$id})`);
        });
      } catch (listError) {
        console.error('Error al intentar listar bases de datos:', listError);
      }
      
      throw error;
    }
  } catch (error) {
    console.error('Error inicializando Appwrite:', error);
    return false;
  }
};

module.exports = {
  client,
  account,
  databases,
  DATABASE_ID,
  USERS_COLLECTION_ID,
  SITES_COLLECTION_ID,
  LOGS_COLLECTION_ID,
  initializeDatabase,
  Query,
  ID,
  Permission,
  Role
}; 