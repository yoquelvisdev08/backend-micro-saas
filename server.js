const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./src/config/db');
const { connectRedis, isRedisConnected } = require('./src/config/redis');
const errorHandler = require('./src/middlewares/error.middleware');
const { setupSwagger } = require('./src/config/swagger');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB().catch(err => {
  console.error('Error conectando a MongoDB:', err);
  process.exit(1);
});

// Connect to Redis (sin detener la aplicación si falla)
connectRedis().catch(err => {
  console.error('Error conectando a Redis (continuando sin funcionalidad de Redis):', err);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Swagger documentation
setupSwagger(app);

// Root route
app.get('/', (req, res) => {
  const redisStatus = isRedisConnected() ? 'conectado' : 'desconectado';
  res.json({ 
    message: 'Welcome to the Backend Micro SaaS API',
    redisStatus,
    docs: `${process.env.API_URL || 'http://localhost:5000'}/api/docs`
  });
});

// Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/sites', require('./src/routes/site.routes'));
app.use('/api/logs', require('./src/routes/log.routes'));
app.use('/api/stats', require('./src/routes/stats.routes'));
app.use('/api/users', require('./src/routes/user.routes'));
app.use('/api/admin', require('./src/routes/admin.routes'));

// 404 handler - for non-existent routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
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