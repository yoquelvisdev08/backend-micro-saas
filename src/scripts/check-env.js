/**
 * Script para verificar las variables de entorno antes de iniciar la aplicación
 */
const dotenv = require('dotenv');
dotenv.config();

console.log('==================================================');
console.log('VERIFICACIÓN DE ENTORNO DE BACKEND MICRO SAAS');
console.log('==================================================');

// Variables requeridas con valores por defecto para producción
const requiredVars = [
  { name: 'PORT', defaultValue: '5000', critical: false },
  { name: 'NODE_ENV', defaultValue: 'production', critical: false },
  { name: 'APPWRITE_ENDPOINT', defaultValue: 'https://cloud.appwrite.io/v1', critical: false },
  { name: 'APPWRITE_PROJECT_ID', defaultValue: null, critical: false },
  { name: 'APPWRITE_API_KEY', defaultValue: null, critical: false },
  { name: 'APPWRITE_DATABASE_ID', defaultValue: null, critical: false },
  { name: 'JWT_SECRET', defaultValue: null, critical: true },
  { name: 'JWT_EXPIRES_IN', defaultValue: '30d', critical: true },
  { name: 'LOG_LEVEL', defaultValue: 'info', critical: false }
];

let missingCriticalVars = false;

requiredVars.forEach(({ name, defaultValue, critical }) => {
  const value = process.env[name];
  
  if (!value && defaultValue) {
    console.log(`⚠️  ${name}: Falta, usando valor por defecto`);
    process.env[name] = defaultValue;
  } else if (!value && critical) {
    console.log(`❌ ${name}: FALTA - Variable CRÍTICA`);
    missingCriticalVars = true;
  } else if (!value) {
    console.log(`⚠️  ${name}: Falta - Algunas funciones podrían no estar disponibles`);
  } else {
    const displayValue = name.includes('SECRET') || name.includes('KEY') 
      ? '********' 
      : value;
    console.log(`✅ ${name}: ${displayValue}`);
  }
});

console.log('--------------------------------------------------');

if (missingCriticalVars) {
  console.error('❌ ERROR: Faltan variables de entorno críticas. La aplicación podría no funcionar correctamente.');
  // No terminamos el proceso para permitir que la aplicación arranque en Railway
  // En un entorno de desarrollo, podríamos usar: process.exit(1);
} else {
  console.log('✅ Todas las variables críticas están configuradas');
}

console.log('=================================================='); 