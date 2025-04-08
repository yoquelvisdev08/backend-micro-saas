const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load env vars for testing
dotenv.config();

// Connect to MongoDB for testing
const connectTestDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options are no longer needed in mongoose 6+
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    });
    
    console.log(`Test MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`Error connecting to test MongoDB: ${err.message}`);
    // Don't exit process, just log error for tests
  }
};

// Disconnect from MongoDB
const disconnectTestDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('Test MongoDB Disconnected');
  } catch (err) {
    console.error(`Error disconnecting from MongoDB: ${err.message}`);
  }
};

module.exports = { connectTestDB, disconnectTestDB }; 