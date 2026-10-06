const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const sanitize = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiters');
const passport = require('./config/passport');

const app = express();
app.set('trust proxy', 1);                 // Render / Railway sit behind a proxy

// ---- OWASP hardening ----
app.use(helmet());                         // secure HTTP headers

// Strict CORS: only origins in CLIENT_URL (comma separated) are allowed
const allowed = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowed.includes(origin)) return cb(null, true); // no origin = Postman/curl/same-origin
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(sanitize);                         // NoSQL-injection + XSS sanitising
app.use(passport.initialize());

// ---- Static demo page ----
app.use(express.static(path.join(__dirname, 'public')));

// ---- API ----
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/v1', apiLimiter);
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/employee', require('./routes/employee'));
app.use('/api/v1/payroll', require('./routes/payroll'));
app.use('/api/v1/users', require('./routes/users'));

// ---- 404 + error handlers ----
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ message: err.message });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ message: 'Server error' });
});

module.exports = app;
