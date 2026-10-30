process.env.NODE_ENV = 'production';
process.env.CLIENT_ORIGIN = 'https://classvoice.example';
process.env.JWT_SECRET = 'deployment-test-secret-with-enough-entropy';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Admin = require('../src/models/Admin');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe('Deployment and administration endpoints', () => {
  test('reports healthy service status', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('allows configured frontend origins and rejects other browser origins', async () => {
    const allowed = await request(app)
      .get('/api/health')
      .set('Origin', 'https://classvoice.example');
    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://classvoice.example');

    const blocked = await request(app)
      .get('/api/health')
      .set('Origin', 'https://untrusted.example');
    expect(blocked.status).toBe(403);
  });

  test('admin can authenticate, review reports, filter, and delete feedback', async () => {
    await Admin.create({
      name: 'Morgan Admin',
      email: 'admin@example.com',
      password: 'secure-admin-123',
    });

    const invalidLogin = await request(app).post('/api/auth/admin/login').send({
      email: 'admin@example.com',
      password: 'incorrect-password',
    });
    expect(invalidLogin.status).toBe(401);

    const login = await request(app).post('/api/auth/admin/login').send({
      email: 'admin@example.com',
      password: 'secure-admin-123',
    });
    expect(login.status).toBe(200);
    const authorization = `Bearer ${login.body.token}`;

    const registration = await request(app).post('/api/auth/register').send({
      name: 'Avery Student',
      email: 'avery@example.com',
      studentId: 'STU-1001',
      password: 'secure-pass-123',
    });
    expect(registration.status).toBe(201);
    const submission = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${registration.body.token}`)
      .send({
        teacherName: 'Jordan Lee',
        courseName: 'Biology',
        rating: 4,
        comment: 'Clear explanations and thoughtful lessons.',
      });
    expect(submission.status).toBe(201);

    const allFeedback = await request(app)
      .get('/api/feedback')
      .set('Authorization', authorization);
    expect(allFeedback.status).toBe(200);
    expect(allFeedback.body.feedback).toHaveLength(1);
    expect(allFeedback.body.feedback[0].studentEmail).toBe('avery@example.com');

    const filteredFeedback = await request(app)
      .get('/api/feedback?studentId=STU-1001&teacher=Jordan&course=Biology')
      .set('Authorization', authorization);
    expect(filteredFeedback.status).toBe(200);
    expect(filteredFeedback.body.feedback).toHaveLength(1);
    expect(filteredFeedback.body.feedback[0].studentEmail).toBe('avery@example.com');

    const stats = await request(app).get('/api/feedback/stats').set('Authorization', authorization);
    expect(stats.status).toBe(200);
    expect(stats.body.total).toBe(1);
    expect(stats.body.averageRating).toBe(4);
    expect(stats.body.courses[0].courseName).toBe('Biology');

    const deleted = await request(app)
      .delete(`/api/feedback/${submission.body.feedback._id}`)
      .set('Authorization', authorization);
    expect(deleted.status).toBe(200);

    const afterDelete = await request(app).get('/api/feedback').set('Authorization', authorization);
    expect(afterDelete.body.feedback).toHaveLength(0);
  });

  test('returns a JSON 404 response for unknown API routes', async () => {
    const response = await request(app).get('/api/not-a-route');
    expect(response.status).toBe(404);
    expect(response.body.message).toMatch(/Route not found/);
  });
});
