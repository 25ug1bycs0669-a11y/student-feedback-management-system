const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    index: true,
  },
  studentName: { type: String, required: true, trim: true },
  studentId: { type: String, required: true, trim: true },
  studentEmail: { type: String, required: true, lowercase: true, trim: true },
  teacherName: { type: String, required: true, trim: true, maxlength: 100 },
  courseName: { type: String, required: true, trim: true, maxlength: 120 },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '', trim: true, maxlength: 1000 },
}, { timestamps: true });

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ courseName: 1 });
feedbackSchema.index({ studentId: 1 });
feedbackSchema.index({ teacherName: 1 });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
