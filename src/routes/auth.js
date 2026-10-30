const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Admin = require('../models/Admin');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again later.' },
});

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Please check the submitted details', errors: errors.array().map((error) => error.msg) });
  }
  return next();
}

function issueToken(user, role) {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
  const token = jwt.sign({ sub: user.id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      ...(role === 'student' ? { studentId: user.studentId } : {}),
      role,
    },
  };
}

const emailRule = body('email').trim().isEmail().withMessage('Enter a valid email address').normalizeEmail();
const passwordRule = body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters');

router.post('/register', [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  emailRule,
  body('studentId').trim().isLength({ min: 2, max: 30 }).withMessage('Student ID must be between 2 and 30 characters').toUpperCase(),
  passwordRule,
], validate, async (req, res, next) => {
  try {
    const { name, email, studentId, password } = req.body;
    const existing = await Student.findOne({ $or: [{ email }, { studentId }] });
    if (existing) return res.status(409).json({ message: 'An account with this email or student ID already exists' });

    const student = await Student.create({ name, email, studentId, password });
    return res.status(201).json(issueToken(student, 'student'));
  } catch (error) {
    return next(error);
  }
});

router.post('/login', loginLimiter, [emailRule, body('password').notEmpty().withMessage('Password is required')], validate, async (req, res, next) => {
  try {
    const student = await Student.findOne({ email: req.body.email }).select('+password');
    if (!student || !(await student.comparePassword(req.body.password))) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }
    return res.json(issueToken(student, 'student'));
  } catch (error) {
    return next(error);
  }
});

router.post('/admin/login', loginLimiter, [emailRule, body('password').notEmpty().withMessage('Password is required')], validate, async (req, res, next) => {
  try {
    const admin = await Admin.findOne({ email: req.body.email }).select('+password');
    if (!admin || !(await admin.comparePassword(req.body.password))) {
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }
    return res.json(issueToken(admin, 'admin'));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
