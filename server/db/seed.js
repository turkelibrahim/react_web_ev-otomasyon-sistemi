const { openDatabase, initializeDatabase } = require('./database');

const db = openDatabase();
try {
  initializeDatabase(db);
  const insert = db.prepare('INSERT INTO device_types (code) VALUES (?) ON CONFLICT(code) DO NOTHING');
  db.transaction(() => {
    for (const code of ['LIGHT', 'THERMOSTAT', 'DOOR_LOCK', 'MOTION_SENSOR']) insert.run(code);
  })();
  console.log('Device types seeded.');
} finally {
  db.close();
}