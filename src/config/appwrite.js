const { Client, Account, Databases, ID, Query, Permission, Role } = require('node-appwrite');
const dotenv = require('dotenv');

// Ensure environment variables are loaded
dotenv.config();

// Log important configuration for debugging
console.log('=========== Appwrite Configuration ===========');
console.log(`APPWRITE_PROJECT_ID: ${process.env.APPWRITE_PROJECT_ID}`);
console.log(`APPWRITE_DATABASE_ID: ${process.env.APPWRITE_DATABASE_ID}`);
console.log(`APPWRITE_API_KEY: ${process.env.APPWRITE_API_KEY ? (process.env.APPWRITE_API_KEY.substring(0, 10) + '...') : 'FALTA'}`);
console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'Configurado' : 'No configurado - usando valor por defecto'}`);
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
 * Get attribute type based on existing attributes
 * @param {Array} existingAttributes - List of existing attributes in the collection
 * @param {Object} collection - Collection information
 */
async function listCollectionAttributes(collectionId) {
  try {
    console.log(`Listing attributes for collection: ${collectionId}`);
    
    // Get the collection attributes
    const attributes = await databases.listAttributes(DATABASE_ID, collectionId);
    console.log(`Found ${attributes.total} attributes in collection ${collectionId}:`);
    
    attributes.attributes.forEach(attr => {
      console.log(`- ${attr.key} (${attr.type}): ${attr.required ? 'Required' : 'Optional'}`);
    });
    
    return attributes.attributes;
  } catch (error) {
    console.error(`Error listing attributes for collection ${collectionId}:`, error);
    return [];
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

      // Print all attributes for each collection
      if (collectionIds.includes(USERS_COLLECTION_ID)) {
        await listCollectionAttributes(USERS_COLLECTION_ID);
      } else {
        console.log(`Collection ${USERS_COLLECTION_ID} does not exist. Please create it manually.`);
      }
      
      if (collectionIds.includes(LOGS_COLLECTION_ID)) {
        await listCollectionAttributes(LOGS_COLLECTION_ID);
      } else {
        console.log(`Collection ${LOGS_COLLECTION_ID} does not exist. Please create it manually.`);
      }
      
      if (collectionIds.includes(SITES_COLLECTION_ID)) {
        await listCollectionAttributes(SITES_COLLECTION_ID);
      } else {
        console.log(`Collection ${SITES_COLLECTION_ID} does not exist. Please create it manually.`);
      }
      
      console.log('Database initialization complete. Using existing attribute structure.');
      
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