const { connectTestDB, disconnectTestDB, databases, DATABASE_ID } = require('../config/appwrite.test');

describe('Database Connection', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('should connect to Appwrite database', async () => {
    // Test if we can get database info
    const database = await databases.get(DATABASE_ID);
    expect(database).toBeDefined();
    expect(database.$id).toBe(DATABASE_ID);
  });
}); 