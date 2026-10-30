const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const Admin = require('../models/Admin');

async function authenticate(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!['student', 'admin'].includes(payload.role) || !payload.sub) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    const Model = payload.role === 'admin' ? Admin : Student;
    const user = await Model.findById(payload.sub).select('_id name email studentId');
    if (!user) return res.status(401).json({ message: 'The account for this token no longer exists' });
    req.user = { id: user.id, name: user.name, email: user.email, studentId: user.studentId, role: payload.role };
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    return next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource' });
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
