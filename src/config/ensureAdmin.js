const Admin = require('../models/Admin');

async function ensureAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL && !ADMIN_PASSWORD) return false;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set both ADMIN_EMAIL and ADMIN_PASSWORD to provision the administrator');
  }
  if (ADMIN_PASSWORD.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }

  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existing = await Admin.findOne({ email });
  if (existing) return false;

  await Admin.create({
    name: ADMIN_NAME || 'System Administrator',
    email,
    password: ADMIN_PASSWORD,
  });
  return true;
}

module.exports = ensureAdmin;
