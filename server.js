const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializeDatabase, isAppwriteConnected } = require('./src/config/appwrite');
const errorHandler = require('./src/middlewares/error.middleware');
const { setupSwagger } = require('./src/config/swagger');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to Appwrite
console.log('Intentando conectar a Appwrite...');
initializeDatabase()
  .then(connected => {
    if (connected) {
      console.log('✅ Appwrite conectado exitosamente');
    } else {
      console.warn('⚠️ No se pudo conectar a Appwrite - La aplicación funcionará con capacidades limitadas');
    }
  })
  .catch(err => {
    console.error('❌ Error al intentar conectar con Appwrite:', err.message);
    console.log('Continuando sin funcionalidades de Appwrite');
  });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Swagger documentation
setupSwagger(app);

// Root route
app.get('/', (req, res) => {
  // Enviar una respuesta más completa que pueda ayudar con los healthchecks
  res.status(200).json({
    status: 'ok',
    message: 'Backend Micro SaaS API is running',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Añadir una ruta específica para healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    appwrite: {
      connected: isAppwriteConnected()
    }
  });
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