const request = require('supertest');
const app = require('../../src/app');

describe('Core Authentication Tests', () => {
    test('should register a new user successfully', async () => {
        const userData = {
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
        };

        const response = await request(app).post('/users/register').send(userData).expect(201);

        expect(response.body).toHaveProperty('message', 'Usuario creado');
    });

    test('should login with valid credentials', async () => {
        // First register a user
        const userData = {
            email: 'login@example.com',
            password: 'password123',
            name: 'Login User',
        };
        await request(app).post('/users/register').send(userData);

        // Then login
        const loginData = {
            email: 'login@example.com',
            password: 'password123',
        };

        const response = await request(app).post('/users/login').send(loginData).expect(200);

        expect(response.body).toHaveProperty('token');
        expect(typeof response.body.token).toBe('string');
    });

    test('should return error for invalid credentials', async () => {
        const loginData = {
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
        };

        const response = await request(app).post('/users/login').send(loginData).expect(401);

        expect(response.body).toHaveProperty('error');
    });
});
