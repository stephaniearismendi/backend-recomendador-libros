const request = require('supertest');
const app = require('../../src/app');

describe('Core Favorites Tests', () => {
    let authToken;
    let testUserId;

    beforeAll(async () => {
        // Create a test user and get auth token
        const userData = {
            email: 'favoritetest@example.com',
            password: 'password123',
            name: 'Favorite Test User',
        };

        await request(app).post('/users/register').send(userData);
        
        const loginResponse = await request(app).post('/users/login').send({
            email: userData.email,
            password: userData.password,
        });
        
        authToken = loginResponse.body.token;
        testUserId = 1; // Mock user ID
    });

    test('should get user favorites successfully', async () => {
        const response = await request(app)
            .get(`/favorites/${testUserId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
    });

    test('should add favorite successfully', async () => {
        const bookData = {
            id: 'test-book-id',
            title: 'Test Book',
            author: 'Test Author',
        };

        const response = await request(app)
            .post(`/favorites/${testUserId}/${bookData.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(bookData)
            .expect(200);

        expect(response.body).toHaveProperty('success', true);
    });

    test('should remove favorite successfully', async () => {
        const response = await request(app)
            .delete(`/favorites/${testUserId}/test-book-id`)
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);

        expect(response.body).toHaveProperty('success', true);
    });

    test('should return error for invalid parameters', async () => {
        const response = await request(app)
            .post('/favorites/invalid/invalid')
            .set('Authorization', `Bearer ${authToken}`)
            .expect(400);

        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('status', 'fail');
    });
});