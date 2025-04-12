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
        url: process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`,
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://web-production-8d975.up.railway.app',
        description: 'Servidor de producción (Railway)'
      }
    ],
    tags: [
      {
        name: 'Autenticación',
        description: 'Endpoints para autenticación y gestión de sesiones'
      },
      {
        name: 'Usuarios',
        description: 'Endpoints para gestión de usuarios'
      },
      {
        name: 'Sitios',
        description: 'Endpoints para gestión y monitoreo de sitios web'
      },
      {
        name: 'Logs',
        description: 'Endpoints para consulta y análisis de logs del sistema'
      },
      {
        name: 'Estadísticas',
        description: 'Endpoints para obtener estadísticas y métricas'
      },
      {
        name: 'Admin',
        description: 'Endpoints exclusivos para administradores'
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
            id: {
              type: 'string',
              description: 'ID único del log'
            },
            type: {
              type: 'string',
              enum: ['auth', 'site', 'system', 'error', 'admin', 'security'],
              description: 'Tipo de log'
            },
            action: {
              type: 'string',
              description: 'Acción realizada (login, create, update, delete, view, etc.)'
            },
            message: {
              type: 'string',
              description: 'Mensaje descriptivo del log'
            },
            userId: {
              type: 'string',
              description: 'ID del usuario relacionado con la acción'
            },
            siteId: {
              type: 'string',
              nullable: true,
              description: 'ID del sitio relacionado (si aplica)'
            },
            siteName: {
              type: 'string',
              nullable: true,
              description: 'Nombre del sitio relacionado (si aplica)'
            },
            status: {
              type: 'string',
              enum: ['success', 'error', 'warning', 'info'],
              default: 'success',
              description: 'Estado del resultado de la acción'
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              default: 'low',
              description: 'Nivel de severidad del log'
            },
            details: {
              type: 'object',
              description: 'Detalles adicionales sobre la acción',
              properties: {
                server: {
                  type: 'object',
                  description: 'Información del servidor'
                },
                performance: {
                  type: 'object',
                  description: 'Métricas de rendimiento'
                },
                errorContext: {
                  type: 'object',
                  description: 'Contexto adicional para errores'
                }
              }
            },
            metadata: {
              type: 'object',
              description: 'Metadatos adicionales del log',
              properties: {
                location: {
                  type: 'object',
                  description: 'Información de geolocalización'
                },
                device: {
                  type: 'object',
                  description: 'Información del dispositivo'
                },
                request: {
                  type: 'object',
                  description: 'Información de la petición'
                }
              }
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Etiquetas para clasificación y búsqueda'
            },
            relatedLogs: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'IDs de logs relacionados'
            },
            duration: {
              type: 'number',
              description: 'Duración de la operación en milisegundos'
            },
            ip: {
              type: 'string',
              description: 'Dirección IP desde donde se realizó la acción'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora de creación del log'
            }
          }
        },
        LogSummary: {
          type: 'object',
          properties: {
            totalLogs: {
              type: 'number',
              description: 'Número total de logs'
            },
            successRate: {
              type: 'number',
              description: 'Porcentaje de logs con estado success'
            },
            errorRate: {
              type: 'number',
              description: 'Porcentaje de logs con estado error'
            },
            avgResponseTime: {
              type: 'number',
              description: 'Tiempo de respuesta promedio en milisegundos'
            },
            mostCommonActions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  action: {
                    type: 'string',
                    description: 'Acción realizada'
                  },
                  count: {
                    type: 'number',
                    description: 'Cantidad de ocurrencias'
                  }
                }
              },
              description: 'Acciones más comunes'
            },
            mostAffectedSites: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  siteId: {
                    type: 'string',
                    description: 'ID del sitio'
                  },
                  siteName: {
                    type: 'string',
                    description: 'Nombre del sitio'
                  },
                  count: {
                    type: 'number',
                    description: 'Cantidad de logs relacionados'
                  }
                }
              },
              description: 'Sitios más afectados'
            },
            severityDistribution: {
              type: 'object',
              properties: {
                low: {
                  type: 'number',
                  description: 'Cantidad de logs con severidad baja'
                },
                medium: {
                  type: 'number',
                  description: 'Cantidad de logs con severidad media'
                },
                high: {
                  type: 'number',
                  description: 'Cantidad de logs con severidad alta'
                },
                critical: {
                  type: 'number',
                  description: 'Cantidad de logs con severidad crítica'
                }
              },
              description: 'Distribución por nivel de severidad'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              description: 'Número total de registros'
            },
            totalPages: {
              type: 'number',
              description: 'Número total de páginas'
            },
            currentPage: {
              type: 'number',
              description: 'Página actual'
            },
            limit: {
              type: 'number',
              description: 'Límite de registros por página'
            },
            hasNextPage: {
              type: 'boolean',
              description: 'Indica si hay una página siguiente'
            },
            hasPrevPage: {
              type: 'boolean',
              description: 'Indica si hay una página anterior'
            }
          }
        },
        Anomaly: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Tipo de anomalía detectada'
            },
            message: {
              type: 'string',
              description: 'Descripción de la anomalía'
            },
            severity: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Nivel de severidad de la anomalía'
            },
            details: {
              type: 'object',
              description: 'Detalles adicionales sobre la anomalía'
            }
          }
        },
        LogStats: {
          type: 'object',
          properties: {
            totalLogs: {
              type: 'number',
              description: 'Número total de logs'
            },
            byType: {
              type: 'object',
              additionalProperties: {
                type: 'number'
              },
              description: 'Distribución por tipo'
            },
            byStatus: {
              type: 'object',
              additionalProperties: {
                type: 'number'
              },
              description: 'Distribución por estado'
            },
            bySeverity: {
              type: 'object',
              additionalProperties: {
                type: 'number'
              },
              description: 'Distribución por severidad'
            },
            byDate: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string',
                    format: 'date',
                    description: 'Fecha'
                  },
                  count: {
                    type: 'number',
                    description: 'Cantidad de logs'
                  }
                }
              },
              description: 'Distribución por fecha'
            },
            performanceStats: {
              type: 'object',
              properties: {
                avgDuration: {
                  type: 'number',
                  description: 'Duración promedio en ms'
                },
                maxDuration: {
                  type: 'number',
                  description: 'Duración máxima en ms'
                },
                p95Duration: {
                  type: 'number',
                  description: 'Percentil 95 de duración en ms'
                }
              },
              description: 'Estadísticas de rendimiento'
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
        },
        Settings: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único de la configuración'
            },
            userId: {
              type: 'string',
              nullable: true,
              description: 'ID del usuario (null para configuraciones globales)'
            },
            section: {
              type: 'string',
              enum: ['general', 'notifications', 'security', 'display', 'integrations', 'billing'],
              description: 'Sección a la que pertenece la configuración'
            },
            key: {
              type: 'string',
              description: 'Clave única dentro de la sección'
            },
            value: {
              type: 'object',
              description: 'Valor de la configuración (puede ser de diferentes tipos)'
            },
            dataType: {
              type: 'string',
              enum: ['string', 'number', 'boolean', 'object', 'array'],
              description: 'Tipo de dato del valor'
            },
            isEncrypted: {
              type: 'boolean',
              default: false,
              description: 'Indica si el valor está encriptado'
            },
            isDefault: {
              type: 'boolean',
              default: false,
              description: 'Indica si es un valor por defecto del sistema'
            },
            metadata: {
              type: 'object',
              properties: {
                displayName: {
                  type: 'string',
                  description: 'Nombre para mostrar en la interfaz'
                },
                description: {
                  type: 'string',
                  description: 'Descripción de la configuración'
                },
                category: {
                  type: 'string',
                  description: 'Categoría dentro de la sección'
                },
                validationRules: {
                  type: 'object',
                  description: 'Reglas de validación para el valor'
                },
                uiProps: {
                  type: 'object',
                  description: 'Propiedades para la interfaz de usuario'
                },
                dependsOn: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'Lista de configuraciones de las que depende'
                }
              },
              description: 'Metadatos de la configuración'
            },
            scope: {
              type: 'string',
              enum: ['global', 'user', 'role'],
              default: 'user',
              description: 'Ámbito de la configuración'
            },
            roleId: {
              type: 'string',
              nullable: true,
              description: 'ID del rol si es una configuración específica de rol'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de última actualización'
            }
          }
        },
        SettingsHistory: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único del historial'
            },
            settingId: {
              type: 'string',
              description: 'ID de la configuración'
            },
            previousValue: {
              type: 'object',
              description: 'Valor anterior de la configuración'
            },
            newValue: {
              type: 'object',
              description: 'Valor nuevo de la configuración'
            },
            changedBy: {
              type: 'string',
              description: 'ID del usuario que realizó el cambio'
            },
            changedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha y hora del cambio'
            },
            reason: {
              type: 'string',
              nullable: true,
              description: 'Razón del cambio'
            }
          }
        },
        SettingsTemplate: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único del template'
            },
            name: {
              type: 'string',
              description: 'Nombre del template'
            },
            description: {
              type: 'string',
              description: 'Descripción del template'
            },
            settings: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Settings'
              },
              description: 'Configuraciones incluidas en el template'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Etiquetas para categorizar el template'
            },
            createdBy: {
              type: 'string',
              description: 'ID del usuario que creó el template'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Fecha de creación del template'
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
        },
        RateLimitError: {
          description: 'Límite de tasa excedido',
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
                    example: 'Demasiadas solicitudes, por favor intente más tarde'
                  }
                }
              }
            }
          }
        },
        NotImplementedError: {
          description: 'Funcionalidad no implementada',
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
                    example: 'Esta funcionalidad estará disponible próximamente'
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
    customCss: '.swagger-ui .topbar { display: none } .swagger-ui .information-container { margin-bottom: 30px; } .swagger-ui .scheme-container { margin: 0 0 20px; padding: 20px 0; }',
    customSiteTitle: 'Micro SaaS API Documentation',
    swaggerOptions: {
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      tryItOutEnabled: true,
      persistAuthorization: true
    }
  }));

  // Ruta para obtener la especificación swagger en formato JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`Swagger Docs disponible en /api/docs`);
};

module.exports = { setupSwagger, swaggerSpec }; 