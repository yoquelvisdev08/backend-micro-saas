const request = require('supertest');
const express = require('express');
const { AppError, notFound, badRequest } = require('../utils/error.utils');
const errorHandler = require('../middlewares/error.middleware');

// Create a test app with error routes
const app = express();
app.use(express.json());

// Test route that throws different kinds of errors
app.get('/test-error/:type', (req, res, next) => {
  const { type } = req.params;
  
  switch (type) {
    case 'not-found':
      return next(notFound('Test resource'));
    
    case 'bad-request':
      return next(badRequest('Invalid test data'));
    
    case 'validation':
      // Simulate a mongoose validation error
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.errors = {
        field1: { message: 'Field1 is required' },
        field2: { message: 'Field2 is invalid' }
      };
      return next(err);
    
    case 'cast':
      // Simulate a mongoose cast error
      const castErr = new Error('Cast error');
      castErr.name = 'CastError';
      castErr.path = '_id';
      castErr.value = 'invalid-id';
      return next(castErr);
    
    case 'duplicate':
      // Simulate a mongoose duplicate key error
      const dupErr = new Error('Duplicate key');
      dupErr.code = 11000;
      return next(dupErr);
    
    default:
      // Generic server error
      return next(new Error('Something went wrong'));
  }
});

// 404 route
app.use((req, res, next) => {
  next(notFound('Route'));
});

// Apply error handler middleware
app.use(errorHandler);

describe('Error Handler Middleware', () => {
  it('should handle custom AppError correctly', async () => {
    const response = await request(app).get('/test-error/not-found');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Test resource not found');
  });
  
  it('should handle bad request errors', async () => {
    const response = await request(app).get('/test-error/bad-request');
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid test data');
  });
  
  it('should format validation errors', async () => {
    const response = await request(app).get('/test-error/validation');
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Field1 is required, Field2 is invalid');
  });
  
  it('should handle cast errors', async () => {
    const response = await request(app).get('/test-error/cast');
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid _id: invalid-id');
  });
  
  it('should handle duplicate key errors', async () => {
    const response = await request(app).get('/test-error/duplicate');
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Duplicate field value entered');
  });
  
  it('should handle generic server errors', async () => {
    const response = await request(app).get('/test-error/server');
    
    expect(response.status).toBe(500);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Something went wrong');
  });
  
  it('should handle 404 routes', async () => {
    const response = await request(app).get('/non-existent-route');
    
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Route not found');
  });
});

describe('AppError Class', () => {
  it('should create the correct error object', () => {
    const error = new AppError('Test error', 400);
    
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.status).toBe('fail');
    expect(error.isOperational).toBe(true);
  });
  
  it('should distinguish between client and server errors', () => {
    const clientError = new AppError('Client error', 400);
    const serverError = new AppError('Server error', 500);
    
    expect(clientError.status).toBe('fail');
    expect(serverError.status).toBe('error');
  });
}); 