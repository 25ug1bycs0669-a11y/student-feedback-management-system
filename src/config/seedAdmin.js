require('dotenv').config();
const mongoose = require('mongoose');
const ensureAdmin = require('./ensureAdmin');

async function seedAdmin() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before seeding an administrator');
  await mongoose.connect(process.env.MONGODB_URI);
  const created = await ensureAdmin();
  console.log(created ? 'Administrator created.' : 'Administrator already exists; no changes made.');
  await mongoose.disconnect();
}

seedAdmin().catch(async (error) => {
  console.error('Unable to seed administrator:', error.message);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
