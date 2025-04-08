# Backend Micro SaaS

[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/yoquelvisdev08/backend-micro-saas/ci.yml?branch=main)](https://github.com/yoquelvisdev08/backend-micro-saas/actions)
[![License](https://img.shields.io/github/license/yoquelvisdev08/backend-micro-saas)](https://github.com/yoquelvisdev08/backend-micro-saas/blob/main/LICENSE)

Un backend completo para una aplicación Micro SaaS, con autenticación, monitoreo de sitios, analíticas y sistema de roles.

## Características

- 🔐 **Autenticación** con JWT y Redis
- 👥 **Gestión de roles** (admin, user)
- 📊 **Analíticas** para monitoreo
- 📝 **Logs** de actividad
- 🔄 **Webhooks** para integración con sistemas externos
- 💰 **Planes** de suscripción
- 📚 **Documentación API** con Swagger
- ☁️ **Listo para deploy** en Railway

## Tecnologías

- Node.js y Express
- MongoDB (Mongoose)
- Redis para caché y tokens
- JWT para autenticación
- Swagger para documentación
- Jest para pruebas
- ESLint y Prettier para formateo de código

## Requisitos previos

- Node.js (v14+)
- MongoDB (local o Atlas)
- Redis (opcional, pero recomendado)

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

4. Configurar variables de entorno en `.env`

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
│   ├── models/         # Modelos de datos
│   ├── routes/         # Rutas API
│   ├── services/       # Servicios
│   ├── utils/          # Utilidades
│   └── tests/          # Tests
```

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

- **Stats**: `/api/stats`
  - GET `/`: Obtener estadísticas

## Despliegue en Railway

1. Crear cuenta en [Railway](https://railway.app/)
2. Instalar Railway CLI: `npm i -g @railway/cli`
3. Login: `railway login`
4. Inicializar proyecto: `railway init`
5. Provisionar MongoDB: `railway add`
6. Provisionar Redis: `railway add`
7. Configurar variables de entorno: `railway vars set KEY=VALUE`
8. Desplegar: `railway up`

## Configuración CI/CD

El proyecto incluye configuración de GitHub Actions para:

- Ejecución de tests
- Linting de código
- Despliegue automático en Railway

## Licencia

ISC

## Autor

[Yoquelvis Abreu](https://github.com/yoquelvisdev08) 