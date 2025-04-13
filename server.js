const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initializeDatabase, isAppwriteConnected } = require('./src/config/appwrite');
const errorHandler = require('./src/middlewares/error.middleware');
const { setupSwagger, swaggerSpec } = require('./src/config/swagger');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Configurar Express para confiar en proxies (necesario para express-rate-limit)
app.set('trust proxy', true);

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

// Endpoint para descargar la documentación en formato TXT
app.get('/api/documentation/download/txt', (req, res) => {
  try {
    // Convertir la especificación a formato legible
    const content = JSON.stringify(swaggerSpec, null, 2);
    
    // Crear un texto formateado más legible
    let txtContent = `# API DOCUMENTATION - MICRO SAAS BACKEND\n\n`;
    txtContent += `## Base URL: ${swaggerSpec.servers[0].url}\n\n`;
    
    // Agregar información general
    txtContent += `# GENERAL INFORMATION\n`;
    txtContent += `Title: ${swaggerSpec.info.title}\n`;
    txtContent += `Version: ${swaggerSpec.info.version}\n`;
    txtContent += `Description: ${swaggerSpec.info.description}\n\n`;
    
    // Recorrer los tags para organizarlos
    swaggerSpec.tags.forEach(tag => {
      txtContent += `# ${tag.name.toUpperCase()}\n`;
      txtContent += `${tag.description}\n\n`;
      
      // Encontrar endpoints para este tag
      Object.keys(swaggerSpec.paths).forEach(path => {
        const methods = swaggerSpec.paths[path];
        Object.keys(methods).forEach(method => {
          const endpoint = methods[method];
          
          if (endpoint.tags && endpoint.tags.includes(tag.name)) {
            txtContent += `## ${method.toUpperCase()} ${path}\n`;
            txtContent += `Summary: ${endpoint.summary || 'No summary'}\n`;
            txtContent += `Description: ${endpoint.description || 'No description'}\n\n`;
            
            // Parámetros
            if (endpoint.parameters && endpoint.parameters.length > 0) {
              txtContent += `Parameters:\n`;
              endpoint.parameters.forEach(param => {
                txtContent += `  - ${param.name} (${param.in}) ${param.required ? '[Required]' : '[Optional]'}: ${param.description || 'No description'}\n`;
              });
              txtContent += `\n`;
            }
            
            // Respuestas
            if (endpoint.responses) {
              txtContent += `Responses:\n`;
              Object.keys(endpoint.responses).forEach(statusCode => {
                txtContent += `  - ${statusCode}: ${endpoint.responses[statusCode].description || 'No description'}\n`;
              });
              txtContent += `\n`;
            }
            
            txtContent += `---\n\n`;
          }
        });
      });
    });
    
    // Configurar respuesta
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename=api-documentation.txt');
    res.send(txtContent);
  } catch (error) {
    console.error('Error al generar documentación TXT:', error);
    res.status(500).send('Error generando documentación en TXT');
  }
});

// Endpoint para descargar la documentación en formato JSON
app.get('/api/documentation/download/json', (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=api-documentation.json');
    res.send(swaggerSpec);
  } catch (error) {
    console.error('Error al generar documentación JSON:', error);
    res.status(500).send('Error generando documentación en JSON');
  }
});

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
app.use('/api/monitor', require('./src/routes/monitor.routes'));

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
const PORT = process.env.PORT || 5001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api/docs`);
  });
}

module.exports = app; 