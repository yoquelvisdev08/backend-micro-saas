# Backend Micro SaaS

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/yoquelvisdev08/backend-micro-saas/ci.yml?branch=main)](https://github.com/yoquelvisdev08/backend-micro-saas/actions)
[![License](https://img.shields.io/github/license/yoquelvisdev08/backend-micro-saas)](https://github.com/yoquelvisdev08/backend-micro-saas/blob/main/LICENSE)

Un backend completo para una aplicación Micro SaaS, con autenticación, monitoreo de sitios, analíticas y sistema de roles, utilizando Appwrite como backend as a service.

## Solución de problemas en Railway

Si estás experimentando problemas con el despliegue en Railway, especialmente con los healthchecks, asegúrate de:

1. **Variables de entorno**: Configura todas las variables de entorno requeridas en Railway:
   - `PORT`: 5000 (o el puerto deseado)
   - `NODE_ENV`: production
   - `APPWRITE_ENDPOINT`: URL de tu instancia de Appwrite
   - `APPWRITE_PROJECT_ID`: ID de tu proyecto de Appwrite
   - `APPWRITE_API_KEY`: Clave API de Appwrite
   - `APPWRITE_DATABASE_ID`: ID de la base de datos en Appwrite
   - `JWT_SECRET`: Clave secreta para firmar tokens JWT
   - `JWT_EXPIRES_IN`: Tiempo de expiración de los tokens

2. **Healthcheck**: Railway realiza un healthcheck en la ruta `/health`. Asegúrate de que esta ruta esté accesible.

3. **Conexión a Appwrite**: Si tienes problemas con Appwrite, la aplicación seguirá funcionando pero con funcionalidad limitada.

4. **Logs**: Revisa los logs en Railway para obtener más información sobre posibles errores.

Para más detalles sobre el despliegue en Railway, consulta el archivo `RAILWAY_DEPLOYMENT.md`.

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
http://localhost:5001/api/docs
```

O en producción:

```
https://web-production-8d975.up.railway.app/api/docs
```

### Categorías de Endpoints

La API está organizada en las siguientes categorías (tags):

- **Autenticación**: Endpoints para autenticación y gestión de sesiones
  - `POST /api/auth/register`: Registrar usuario
  - `POST /api/auth/login`: Iniciar sesión
  - `GET /api/auth/me`: Obtener perfil
  - `POST /api/auth/logout`: Cerrar sesión

- **Usuarios**: Endpoints para gestión de usuarios
  - `PUT /api/users/webhook`: Actualizar URL de webhook
  - `DELETE /api/users/webhook`: Eliminar URL de webhook
  - `POST /api/users/webhook/test`: Probar webhook

- **Sitios**: Endpoints para gestión y monitoreo de sitios web
  - `GET /api/sites`: Listar todos los sitios
  - `POST /api/sites`: Crear nuevo sitio
  - `GET /api/sites/:id`: Obtener un sitio
  - `PUT /api/sites/:id`: Actualizar sitio
  - `DELETE /api/sites/:id`: Eliminar sitio

- **Logs**: Endpoints para consulta y análisis de logs del sistema
  - `GET /api/logs`: Listar logs con filtrado avanzado
  - `GET /api/logs/export`: Exportar logs en CSV o JSON
  - `GET /api/logs/stats`: Obtener estadísticas de logs
  - `GET /api/logs/admin`: Obtener todos los logs (admin)
  - `GET /api/logs/trends`: Obtener tendencias en logs

- **Estadísticas**: Endpoints para obtener estadísticas y métricas
  - `GET /api/stats`: Obtener estadísticas generales
  - `GET /api/stats/activity`: Obtener distribución de actividad
  - `GET /api/stats/user`: Obtener estadísticas del usuario autenticado
  - `GET /api/stats/user/:userId`: Obtener estadísticas de un usuario específico (admin)
  - `GET /api/stats/admin`: Obtener estadísticas de la plataforma (admin)

- **Admin**: Endpoints exclusivos para administradores
  - `GET /api/admin/users`: Obtener todos los usuarios
  - `GET /api/admin/users/:id`: Obtener detalles de un usuario
  - `DELETE /api/admin/users/:id`: Eliminar un usuario
  - `PUT /api/admin/users/:id/role`: Actualizar rol de un usuario

### Uso de la documentación de Swagger

La documentación de Swagger proporciona una interfaz interactiva para explorar y probar la API:

1. **Autenticación**: Utiliza el botón "Authorize" para introducir tu token JWT
2. **Exploración**: Los endpoints están agrupados por tags para facilitar la navegación
3. **Pruebas**: Cada endpoint puede ser probado en tiempo real con el botón "Try it out"
4. **Modelos**: Puedes ver los modelos de datos en la sección "Schemas"

Para obtener un token JWT, primero debes registrarte o iniciar sesión a través de los endpoints de autenticación.

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