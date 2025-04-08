# Despliegue en Railway

Este documento detalla los pasos necesarios para desplegar esta aplicación en [Railway](https://railway.app/), una plataforma moderna de despliegue en la nube.

## Prerrequisitos

1. Una cuenta en Railway (puedes crear una gratis en [railway.app](https://railway.app/))
2. La CLI de Railway instalada (`npm install -g @railway/cli`)
3. Un repositorio Git con tu código (como GitHub)

## Pasos para el despliegue

### 1. Iniciar sesión en Railway

```bash
railway login
```

Esto abrirá una ventana del navegador donde deberás autenticarte.

### 2. Inicializar un proyecto

```bash
railway init
```

Selecciona "Empty Project" o conecta con un repositorio de GitHub.

### 3. Provisionar servicios necesarios

#### MongoDB

```bash
railway add
```

Selecciona "MongoDB" de la lista de plugins disponibles.

#### Redis

```bash
railway add
```

Selecciona "Redis" de la lista de plugins disponibles.

### 4. Configurar variables de entorno

```bash
railway vars set PORT=5000
railway vars set NODE_ENV=production
railway vars set JWT_SECRET=tu_clave_secreta_aqui
railway vars set JWT_EXPIRE=24h
```

Las variables `MONGO_URI` y `REDIS_URL` se configurarán automáticamente cuando aprovisiones esos servicios.

### 5. Desplegar la aplicación

```bash
railway up
```

### 6. Abrir la aplicación

```bash
railway open
```

## Configuración de dominio personalizado (opcional)

1. En el dashboard de Railway, ve a tu proyecto
2. Selecciona la pestaña "Settings"
3. En la sección "Domains", haz clic en "Generate Domain" o configura un dominio personalizado

## Configuración de despliegue automático

El archivo `.github/workflows/ci.yml` ya incluye la configuración necesaria para el despliegue automático en Railway cuando se hace push a la rama main.

Para que esto funcione, necesitas:

1. Obtener un token de Railway:
   ```bash
   railway login
   railway variables
   ```

2. Agregar el token como un secreto en tu repositorio de GitHub:
   - Nombre: `RAILWAY_TOKEN`
   - Valor: (tu token de Railway)

## Solución de problemas

### La aplicación no se conecta a la base de datos

- Verifica las variables de entorno (`railway vars`)
- Asegúrate de que MongoDB esté aprovisionado correctamente
- Revisa los logs (`railway logs`)

### Problemas con Redis

- Verifica que Redis esté aprovisionado correctamente
- Si no puedes usar Redis, configura `DISABLE_REDIS=true`
- Revisa los logs para errores específicos

### La aplicación se reinicia constantemente

- Revisa los logs para identificar errores
- Verifica que todas las dependencias estén correctamente instaladas
- Asegúrate de que la versión de Node.js sea compatible 