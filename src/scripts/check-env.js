/**
 * Script para verificar las variables de entorno antes de iniciar la aplicación
 */
const dotenv = require('dotenv');
dotenv.config();

console.log('==================================================');
console.log('VERIFICACIÓN DE ENTORNO DE BACKEND MICRO SAAS');
console.log('==================================================');

// Variables críticas para el funcionamiento
const requiredVars = [
  'PORT',
  'NODE_ENV',
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_API_KEY',
  'APPWRITE_DATABASE_ID',
  'JWT_SECRET',
  'JWT_EXPIRES_IN'
];

// Establecer valores por defecto para algunas variables
if (!process.env.PORT) process.env.PORT = '5000';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
if (!process.env.APPWRITE_ENDPOINT) process.env.APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
if (!process.env.JWT_EXPIRES_IN) process.env.JWT_EXPIRES_IN = '30d';
if (!process.env.LOG_LEVEL) process.env.LOG_LEVEL = 'info';

// Verificar y mostrar el estado de las variables
requiredVars.forEach(name => {
  const value = process.env[name];
  if (!value) {
    console.log(`⚠️  ${name}: No configurado`);
  } else {
    const displayValue = name.includes('SECRET') || name.includes('KEY') 
      ? '********' 
      : value;
    console.log(`✅ ${name}: ${displayValue}`);
  }
});

console.log('==================================================');
