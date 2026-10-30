const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Feedback = require('../models/Feedback');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Please check the submitted details', errors: errors.array().map((error) => error.msg) });
  }
  return next();
}

router.use(authenticate);

router.post('/', authorize('student'), [
  body('teacherName').trim().isLength({ min: 2, max: 100 }).withMessage('Teacher name must be between 2 and 100 characters'),
  body('courseName').trim().isLength({ min: 2, max: 120 }).withMessage('Course name must be between 2 and 120 characters'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be a whole number from 1 to 5').toInt(),
  body('comment')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim() : value))
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Comment must be between 3 and 1000 characters'),
], validate, async (req, res, next) => {
  try {
    const feedback = await Feedback.create({
      student: req.user.id,
      studentName: req.user.name,
      studentId: req.user.studentId,
      studentEmail: req.user.email,
      teacherName: req.body.teacherName,
      courseName: req.body.courseName,
      rating: req.body.rating,
      comment: req.body.comment || '',
    });
    return res.status(201).json({ feedback });
  } catch (error) {
    return next(error);
  }
});

router.get('/history', authorize('student'), async (req, res, next) => {
  try {
    const feedback = await Feedback.find({ student: req.user.id }).sort({ createdAt: -1 }).lean();
    return res.json({ feedback });
  } catch (error) {
    return next(error);
  }
});

router.get('/stats', authorize('admin'), async (req, res, next) => {
  try {
    const [summary, courses, recent] = await Promise.all([
      Feedback.aggregate([
        { $group: { _id: null, total: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
      ]),
      Feedback.aggregate([
        { $group: { _id: '$courseName', count: { $sum: 1 }, averageRating: { $avg: '$rating' } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 8 },
      ]),
      Feedback.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);
    return res.json({
      total: summary[0]?.total || 0,
      averageRating: summary[0] ? Number(summary[0].averageRating.toFixed(2)) : 0,
      courses: courses.map((course) => ({
        courseName: course._id,
        count: course.count,
        averageRating: Number(course.averageRating.toFixed(2)),
      })),
      recent,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/', authorize('admin'), [
  query('studentId').optional().trim().isLength({ max: 30 }).withMessage('Student ID filter is too long'),
  query('teacher').optional().trim().isLength({ max: 100 }).withMessage('Teacher filter is too long'),
  query('course').optional().trim().isLength({ max: 120 }).withMessage('Course filter is too long'),
], validate, async (req, res, next) => {
  try {
    const filter = {};
    for (const [parameter, field] of [
      ['studentId', 'studentId'],
      ['teacher', 'teacherName'],
      ['course', 'courseName'],
    ]) {
      if (req.query[parameter]) {
        const escaped = req.query[parameter].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter[field] = { $regex: escaped, $options: 'i' };
      }
    }

    const feedback = await Feedback.find(filter)
      .populate('student', 'email')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    const results = feedback.map((item) => ({
      ...item,
      studentEmail: item.studentEmail || item.student?.email || '',
    }));
    return res.json({ feedback: results });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const deleted = await Feedback.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Feedback not found' });
    return res.json({ message: 'Feedback deleted' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
