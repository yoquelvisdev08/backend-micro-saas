const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuración básica para swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Backend Micro SaaS API',
      version: '1.0.0',
      description: 'API para el Backend de una aplicación Micro SaaS',
      contact: {
        name: 'Equipo de Desarrollo',
        email: 'info@microsaas.example.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000',
        description: 'Servidor de desarrollo'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: {
              type: 'string',
              description: 'Nombre completo del usuario'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Correo electrónico del usuario (debe ser único)'
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Contraseña del usuario (mínimo 6 caracteres)'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'Rol del usuario'
            },
            plan: {
              type: 'string',
              enum: ['free', 'pro', 'enterprise'],
              description: 'Plan de suscripción del usuario'
            }
          }
        },
        Site: {
          type: 'object',
          required: ['name', 'url'],
          properties: {
            name: {
              type: 'string',
              description: 'Nombre del sitio'
            },
            url: {
              type: 'string',
              format: 'uri',
              description: 'URL del sitio web'
            },
            userId: {
              type: 'string',
              description: 'ID del usuario propietario'
            }
          }
        },
        Log: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['auth', 'site', 'system', 'error', 'test'],
              description: 'Tipo de log'
            },
            action: {
              type: 'string',
              description: 'Acción realizada'
            },
            message: {
              type: 'string',
              description: 'Mensaje del log'
            },
            userId: {
              type: 'string',
              description: 'ID del usuario relacionado'
            },
            metadata: {
              type: 'object',
              description: 'Datos adicionales del log'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Token de acceso no proporcionado o inválido',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { 
                    type: 'boolean',
                    example: false
                  },
                  message: { 
                    type: 'string',
                    example: 'Not authorized to access this route'
                  }
                }
              }
            }
          }
        },
        BadRequest: {
          description: 'Solicitud inválida',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { 
                    type: 'boolean',
                    example: false 
                  },
                  message: { 
                    type: 'string',
                    example: 'Invalid request data'
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js', './src/models/*.js']
};

// Generar la especificación swagger en formato JSON
const swaggerSpec = swaggerJsDoc(swaggerOptions);

// Función para configurar swagger en la aplicación
const setupSwagger = (app) => {
  // Ruta para acceder a la documentación
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Micro SaaS API Documentation',
  }));

  // Ruta para obtener la especificación swagger en formato JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`Swagger Docs disponible en /api/docs`);
};

module.exports = { setupSwagger, swaggerSpec }; 