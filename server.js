const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializeDatabase } = require('./src/config/appwrite');
const errorHandler = require('./src/middlewares/error.middleware');
const { setupSwagger } = require('./src/config/swagger');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to Appwrite
initializeDatabase().catch(err => {
  console.error('Error connecting to Appwrite:', err);
  // Do not exit, continue even if Appwrite connection fails
  console.log('Continuing without full Appwrite functionality');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Swagger documentation
setupSwagger(app);

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Backend Micro SaaS API - Powered by Appwrite');
});

// Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/sites', require('./src/routes/site.routes'));
app.use('/api/logs', require('./src/routes/log.routes'));
app.use('/api/stats', require('./src/routes/stats.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));

// Test route
app.get('/api/test', (req, res) => {
  res.send('API funcionando correctamente con Appwrite!');
});

// 404 handler - for non-existent routes
app.use((req, res, next) => {
  res.status(404).send(`Route not found: ${req.originalUrl}`);
});

// Global error handler middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api/docs`);
  });
}

module.exports = app; 