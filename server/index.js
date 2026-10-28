require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('express-async-errors');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60000, limit: 300 }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_, res) => res.json({ ok: true }));
app.use('/api/auth', rateLimit({ windowMs: 60000, limit: 20 }), require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/prescriptions', require('./routes/prescriptions'));
app.use('/api/doses', require('./routes/doses'));
app.use('/api/vitals', require('./routes/vitals'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/ai', require('./routes/ai'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err.name === 'MulterError') return res.status(400).json({ message: err.message });
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Internal server error' });
});

if (!process.env.JWT_SECRET || !process.env.MONGO_URI) { console.error('Missing JWT_SECRET or MONGO_URI in .env'); process.exit(1); }
connectDB().then(() => {
  require('./services/cron').start();
  app.listen(process.env.PORT || 5000, () => console.log(`API running on :${process.env.PORT || 5000}`));
}).catch((e) => { console.error('DB connection failed:', e.message); process.exit(1); });
