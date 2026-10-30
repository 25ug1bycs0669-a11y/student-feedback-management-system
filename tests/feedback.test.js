const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const Student = require('../src/models/Student');
const Admin = require('../src/models/Admin');
const Feedback = require('../src/models/Feedback');

let mongo;
let studentToken;
let adminToken;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-with-enough-entropy';
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

async function registerStudent(overrides = {}) {
  return request(app).post('/api/auth/register').send({
    name: 'Avery Student',
    email: 'avery@example.com',
    studentId: 'STU-1001',
    password: 'secure-pass-123',
    ...overrides,
  });
}

async function loginStudent() {
  const response = await registerStudent();
  studentToken = response.body.token;
  return response;
}

async function loginAdmin() {
  const admin = await Admin.create({
    name: 'Morgan Admin',
    email: 'admin@example.com',
    password: 'secure-admin-123',
  });
  const response = await request(app).post('/api/auth/admin/login').send({
    email: admin.email,
    password: 'secure-admin-123',
  });
  adminToken = response.body.token;
  return response;
}

describe('Student feedback API', () => {
  test('registers a student and returns an access token', async () => {
    const response = await registerStudent();
    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('student');
    expect(response.body.token).toBeTruthy();
    const student = await Student.findOne({ email: 'avery@example.com' }).select('+password');
    expect(student.password).not.toBe('secure-pass-123');
  });

  test('rejects duplicate student registration', async () => {
    await registerStudent();
    const response = await registerStudent();
    expect(response.status).toBe(409);
  });

  test('logs in a student with valid credentials', async () => {
    await registerStudent();
    const response = await request(app).post('/api/auth/login').send({
      email: 'avery@example.com',
      password: 'secure-pass-123',
    });
    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
  });

  test('rejects invalid login credentials', async () => {
    await registerStudent();
    const response = await request(app).post('/api/auth/login').send({
      email: 'avery@example.com',
      password: 'incorrect-password',
    });
    expect(response.status).toBe(401);
  });

  test('returns a client error for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ invalid');
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/valid JSON/);
  });

  test('rejects empty feedback submission', async () => {
    await loginStudent();
    const response = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});
    expect(response.status).toBe(400);
  });

  test('accepts valid feedback and returns student history', async () => {
    await loginStudent();
    const response = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        teacherName: 'Jordan Lee',
        courseName: 'Human-centered Design',
        rating: 5,
        comment: 'Thoughtful lessons and helpful feedback.',
      });
    expect(response.status).toBe(201);
    const history = await request(app)
      .get('/api/feedback/history')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(history.status).toBe(200);
    expect(history.body.feedback).toHaveLength(1);
  });

  test('persists feedback with omitted comments for students and administrators', async () => {
    await loginStudent();
    const submission = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        teacherName: 'Jordan Lee',
        courseName: 'Human-centered Design',
        rating: 5,
        studentName: 'Imposter Name',
        studentId: 'STU-IMPOSTER',
        studentEmail: 'imposter@example.com',
      });

    expect(submission.status).toBe(201);
    const savedFeedback = await Feedback.findById(submission.body.feedback._id).lean();
    expect(savedFeedback).toMatchObject({
      teacherName: 'Jordan Lee',
      courseName: 'Human-centered Design',
      rating: 5,
      studentName: 'Avery Student',
      studentId: 'STU-1001',
      studentEmail: 'avery@example.com',
      comment: '',
    });

    await loginAdmin();
    const adminFeedback = await request(app)
      .get('/api/feedback')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminFeedback.status).toBe(200);
    expect(adminFeedback.body.feedback).toHaveLength(1);
    expect(adminFeedback.body.feedback[0].studentEmail).toBe('avery@example.com');

    const filteredFeedback = await request(app)
      .get('/api/feedback?studentId=stu-1001&teacher=Jordan&course=Design')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filteredFeedback.status).toBe(200);
    expect(filteredFeedback.body.feedback).toHaveLength(1);

    const unmatchedFeedback = await request(app)
      .get('/api/feedback?studentId=STU-404')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(unmatchedFeedback.body.feedback).toHaveLength(0);
  });

  test('rejects ratings outside the range of one to five', async () => {
    await loginStudent();
    const response = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        teacherName: 'Jordan Lee',
        courseName: 'Human-centered Design',
        rating: 6,
        comment: 'A rating outside the allowed range.',
      });
    expect(response.status).toBe(400);
  });

  test('rejects requests without authentication', async () => {
    const response = await request(app).get('/api/feedback/history');
    expect(response.status).toBe(401);
  });

  test('students can only see their own feedback and cannot access admin reports', async () => {
    await loginStudent();
    await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        teacherName: 'Jordan Lee',
        courseName: 'Biology',
        rating: 4,
      })
      .expect(201);

    const secondStudent = await registerStudent({
      name: 'Taylor Student',
      email: 'taylor@example.com',
      studentId: 'STU-2002',
    });
    const history = await request(app)
      .get('/api/feedback/history')
      .set('Authorization', `Bearer ${secondStudent.body.token}`);
    expect(history.status).toBe(200);
    expect(history.body.feedback).toHaveLength(0);

    const stats = await request(app)
      .get('/api/feedback/stats')
      .set('Authorization', `Bearer ${secondStudent.body.token}`);
    expect(stats.status).toBe(403);

    const deleteAttempt = await request(app)
      .delete('/api/feedback/000000000000000000000000')
      .set('Authorization', `Bearer ${secondStudent.body.token}`);
    expect(deleteAttempt.status).toBe(403);
  });

  test('enforces admin-only feedback access and permits admin retrieval', async () => {
    await loginStudent();
    const denied = await request(app)
      .get('/api/feedback')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(denied.status).toBe(403);

    await loginAdmin();
    const allowed = await request(app)
      .get('/api/feedback')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body.feedback).toEqual([]);

    const filtered = await request(app)
      .get('/api/feedback?course=%28')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(filtered.status).toBe(200);
  });
});
