require('dotenv').config();

const app = require('./src/app');
const connectDatabase = require('./src/config/database');
const ensureAdmin = require('./src/config/ensureAdmin');

const port = Number(process.env.PORT) || 3000;

if (require.main === module) {
  connectDatabase()
    .then(async () => {
      const adminCreated = await ensureAdmin();
      if (adminCreated) console.log('Initial administrator provisioned from environment configuration.');
      app.listen(port, () => {
        console.log(`Student Feedback System listening on port ${port}`);
      });
    })
    .catch((error) => {
      console.error('Unable to start the application:', error.message);
      process.exitCode = 1;
    });
}

module.exports = app;
