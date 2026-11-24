const { databasePath, openDatabase, initializeDatabase } = require('./database');

const db = openDatabase();
try {
  initializeDatabase(db);
  console.log(`Database initialized: ${databasePath}`);
} finally {
  db.close();
}