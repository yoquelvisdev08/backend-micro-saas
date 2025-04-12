# Migration Guide: MongoDB/Redis to Appwrite

This guide outlines the steps needed to complete the migration from MongoDB and Redis to Appwrite in the Micro SaaS Backend project.

## Pre-requisites

1. An Appwrite account (you can sign up at [cloud.appwrite.io](https://cloud.appwrite.io))
2. Node.js 14+ installed on your machine
3. The backend project with the migration code (which you already have)

## Step 1: Create an Appwrite Project

1. Sign in to your Appwrite account
2. Create a new project
3. Note down the Project ID

## Step 2: Create an API Key

1. In your Appwrite project, navigate to "API Keys"
2. Create a new API key with the following permissions:
   - `databases.read`
   - `databases.write`
   - `databases.collections.read`
   - `databases.collections.write`
   - `databases.documents.read`
   - `databases.documents.write`
3. Save your API key securely (you already have it: `standard_10dbacb844e98848ed5772faf82b6359e892cb07655be162ea174435076dd373daa681fc79b35ea4f4b99b0f74e3eb7ca50c16e07f5ecc411c0dc7bb4303932690285a103b4d4f14c88c38b59d8c6f2d56b0726c9a9f129c4b0a51e6a03b3d32fe98609e899a1d8ebacca1ed65e2957fcbd57e5491d0cbf52d6948c374858237`)

## Step 3: Create a Database

1. Navigate to the "Databases" section in your Appwrite dashboard
2. Click "Create Database"
3. Name it "MicroSaasDB" (or any name you prefer)
4. Note down the Database ID

## Step 4: Configure Environment Variables

1. Open the `.env` file in the project root
2. Update the following variables:
   ```
   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   APPWRITE_PROJECT_ID=your_project_id
   APPWRITE_API_KEY=your_api_key
   APPWRITE_DATABASE_ID=your_database_id
   ```

## Step 5: Run the Setup Script

The setup script will create all necessary collections and attributes in your Appwrite database:

```bash
npm run setup-appwrite
```

This will create:
- A `users` collection for user data
- A `sites` collection for the monitored sites
- A `logs` collection for activity logs

## Step 6: Start the Application

You can now start the application:

```bash
npm run dev
```

## Data Migration (Optional)

If you need to migrate existing data from MongoDB to Appwrite, you can create a script that reads from MongoDB and writes to Appwrite. A sample script structure would be:

```javascript
const { MongoClient } = require('mongodb');
const { Client, Databases, ID } = require('node-appwrite');

async function migrateData() {
  // Connect to MongoDB
  const mongoClient = new MongoClient(process.env.MONGO_URI);
  await mongoClient.connect();
  
  // Initialize Appwrite
  const appwriteClient = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  
  const databases = new Databases(appwriteClient);
  
  // Migrate users
  const users = await mongoClient.db().collection('users').find({}).toArray();
  for (const user of users) {
    // Transform MongoDB document to Appwrite format
    const appwriteUser = {
      name: user.name,
      email: user.email,
      password: user.password, // Note: passwords are already hashed
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
    
    // Create user in Appwrite
    await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      'users',
      ID.unique(),
      appwriteUser
    );
  }
  
  // Repeat for other collections...
  
  await mongoClient.close();
}

migrateData().catch(console.error);
```

## Troubleshooting

- **Collection Creation Issues**: If the setup script fails to create collections, you may need to create them manually through the Appwrite dashboard, following the structure defined in the setup script.
- **Authentication Issues**: Ensure your API key has the correct permissions.
- **Rate Limiting**: Appwrite has rate limits. If you're migrating large datasets, consider adding delays between requests.

## Architecture Changes

This migration has changed:
1. MongoDB → Appwrite Database for data storage
2. Redis → Custom session handling with JWT
3. Mongoose schemas → Appwrite collections

The API endpoints and business logic remain the same, only the data layer has been changed. 