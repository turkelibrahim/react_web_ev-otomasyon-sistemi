const express = require('express');
const { openDatabase, initializeDatabase } = require('./db/database');

const db = openDatabase();
try {
  initializeDatabase(db);
} finally {
  db.close();
}

const app = express();
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  const status = err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});
app.listen(5000, () => console.log('Server listening on http://localhost:5000'));
