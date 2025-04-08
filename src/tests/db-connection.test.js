const mongoose = require('mongoose');
const { connectTestDB, disconnectTestDB } = require('../config/db.test');

describe('Database Connection', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  it('should connect to MongoDB Atlas', () => {
    expect(mongoose.connection.readyState).toBe(1);
  });
}); 