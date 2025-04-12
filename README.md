# Backend Micro SaaS

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/yoquelvisdev08/backend-micro-saas/ci.yml?branch=main)](https://github.com/yoquelvisdev08/backend-micro-saas/actions)
[![License](https://img.shields.io/github/license/yoquelvisdev08/backend-micro-saas)](https://github.com/yoquelvisdev08/backend-micro-saas/blob/main/LICENSE)

Un backend completo para una aplicación Micro SaaS, con autenticación, monitoreo de sitios, analíticas y sistema de roles, utilizando Appwrite como backend as a service.

## Características

- 🔐 **Autenticación** con JWT y Appwrite
- 👥 **Gestión de roles** (admin, user)
- 📊 **Analíticas** para monitoreo
- 📝 **Logs** de actividad
- 🔄 **Webhooks** para integración con sistemas externos
- 💰 **Planes** de suscripción
- 📚 **Documentación API** con Swagger
- ☁️ **Listo para deploy** en Railway

## Tecnologías

- Node.js y Express
- Appwrite como base de datos y autenticación
- JWT para autenticación
- Swagger para documentación
- Jest para pruebas
- ESLint y Prettier para formateo de código

## Requisitos previos

- Node.js (v14+)
- Cuenta en Appwrite y un proyecto configurado

## Instalación

1. Clonar el repositorio:

```bash
git clone https://github.com/yoquelvisdev08/backend-micro-saas.git
cd backend-micro-saas
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear archivo `.env` basado en `.env.example`:

```bash
cp .env.example .env
```

4. Configurar variables de entorno en `.env`:

```
# Server Configuration
PORT=5000
NODE_ENV=development

# Appwrite Configuration
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_appwrite_project_id
# Esta API Key necesita permisos: databases.read, databases.write, documents.read, documents.write, collections.read, collections.write
APPWRITE_API_KEY=your_appwrite_api_key
APPWRITE_DATABASE_ID=your_appwrite_database_id

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_goes_here
JWT_EXPIRES_IN=30d

# Logging
LOG_LEVEL=debug
```

## Ejecución

### Desarrollo

```bash
npm run dev
```

### Producción

```bash
npm start
```

### Tests

```bash
npm test
```

## Estructura del proyecto

```
├── server.js           # Punto de entrada
├── src/
│   ├── config/         # Configuración
│   ├── controllers/    # Controladores
│   ├── middlewares/    # Middlewares
│   ├── services/       # Servicios
│   ├── routes/         # Rutas API
│   ├── utils/          # Utilidades
│   └── tests/          # Tests
```

## Configuración de Appwrite

1. Crea una cuenta en [Appwrite](https://appwrite.io) si aún no la tienes
2. Crea un nuevo proyecto
3. En la sección "Database" crea una nueva base de datos
4. Dentro de esa base de datos, crea las siguientes colecciones:
   - `users`: Para almacenar la información de los usuarios
   - `sites`: Para almacenar los sitios que se monitorean
   - `logs`: Para almacenar los logs de actividad
5. Configura los atributos de cada colección según los modelos de la aplicación
6. Genera una API key con los permisos necesarios:
   - databases.read
   - databases.write
   - documents.read
   - documents.write
   - collections.read
   - collections.write
7. Copia los IDs y tokens correspondientes a tu archivo `.env`

## API Endpoints

La documentación completa de la API está disponible en Swagger:

```
http://localhost:5000/api/docs
```

### Principales endpoints

- **Auth**: `/api/auth/*`
  - POST `/register`: Registrar usuario
  - POST `/login`: Iniciar sesión
  - GET `/me`: Obtener perfil
  - POST `/logout`: Cerrar sesión

- **Sites**: `/api/sites/*`
  - GET `/`: Listar todos los sitios
  - POST `/`: Crear nuevo sitio
  - GET `/:id`: Obtener un sitio
  - PUT `/:id`: Actualizar sitio
  - DELETE `/:id`: Eliminar sitio

- **Logs**: `/api/logs/*`
  - GET `/`: Listar logs

- **Stats**: `/api/stats/*`
  - GET `/`: Obtener estadísticas generales
  - GET `/activity`: Obtener distribución de actividad
  - GET `/user`: Obtener estadísticas del usuario autenticado
  - GET `/user/:userId`: Obtener estadísticas de un usuario específico (admin)
  - GET `/admin`: Obtener estadísticas de la plataforma (admin)

- **Admin**: `/api/admin/*`
  - Diversos endpoints para gestión administrativa

- **User**: `/api/user/*`
  - Endpoints para gestión de usuarios

## Despliegue en Railway

1. Crear cuenta en [Railway](https://railway.app/)
2. Instalar Railway CLI: `npm i -g @railway/cli`
3. Login: `railway login`
4. Inicializar proyecto: `railway init`
5. Configurar variables de entorno: `railway vars set KEY=VALUE`
6. Desplegar: `railway up`

## Configuración CI/CD

El proyecto incluye configuración de GitHub Actions para:

- Ejecución de tests
- Linting de código
- Despliegue automático en Railway

## Licencia

ISC

## Autor

[Yoquelvis Abreu](https://github.com/yoquelvisdev08) 