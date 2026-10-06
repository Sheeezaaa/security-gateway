const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('../config/passport');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');
const {
  COOKIE_NAME, sha256, signAccessToken, createRefreshToken,
  setRefreshCookie, clearRefreshCookie
} = require('../utils/tokens');

const router = express.Router();
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- REGISTER ----------
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (![name, email, password].every((v) => typeof v === 'string' && v.length))
      return res.status(400).json({ message: 'name, email and password are required strings' });
    if (!EMAIL_RE.test(email))
      return res.status(400).json({ message: 'Invalid email address' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);        // salted bcrypt hash
    // Role is never read from the request, so nobody can self-assign admin.
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({ message: 'Registered successfully', id: user._id, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- LOGIN ----------
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string')
      return res.status(400).json({ message: 'email and password are required strings' });

    const user = await User.findOne({ email: email.toLowerCase() });
    const invalid = () => res.status(401).json({ message: 'Invalid email or password' });

    if (!user || !user.password) return invalid();

    // Account lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(423).json({ message: 'Account locked due to failed attempts. Try again later.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= MAX_FAILED) {
        user.lockUntil = new Date(Date.now() + LOCK_MS);
        user.failedAttempts = 0;
      }
      await user.save();
      return invalid();
    }

    user.failedAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    const { token } = await createRefreshToken(user);
    setRefreshCookie(res, token);
    res.json({ accessToken: signAccessToken(user), role: user.role, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- REFRESH (with rotation + reuse detection) ----------
router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (e) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const stored = await RefreshToken.findOne({ tokenHash: sha256(token) });
    if (!stored) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Refresh token not recognised' });
    }

    // An already-used token is being replayed -> assume theft, kill the whole chain
    if (stored.revoked) {
      await RefreshToken.updateMany({ family: stored.family }, { revoked: true });
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'Refresh token reuse detected. All sessions revoked.' });
    }

    const user = await User.findById(payload.id);
    if (!user) {
      clearRefreshCookie(res);
      return res.status(401).json({ message: 'User no longer exists' });
    }

    // Rotate: revoke old, issue new in the same family
    stored.revoked = true;
    await stored.save();
    const { token: newToken } = await createRefreshToken(user, stored.family);
    setRefreshCookie(res, newToken);

    res.json({ accessToken: signAccessToken(user), role: user.role, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- LOGOUT (revocation) ----------
router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (token) {
      const stored = await RefreshToken.findOne({ tokenHash: sha256(token) });
      if (stored) await RefreshToken.updateMany({ family: stored.family }, { revoked: true });
    }
    clearRefreshCookie(res);
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- OAUTH ----------
async function oauthSuccess(req, res) {
  try {
    const { token } = await createRefreshToken(req.user);
    setRefreshCookie(res, token);
    // Frontend then calls POST /auth/refresh to obtain the access token (no token in URL)
    res.redirect('/?oauth=success');
  } catch (err) {
    console.error(err);
    res.redirect('/?error=oauth_failed');
  }
}

function providerRoutes(name, scope) {
  router.get(`/${name}`, (req, res, next) => {
    if (!passport._strategy(name))
      return res.status(501).json({ message: `${name} OAuth is not configured on this server` });
    passport.authenticate(name, { scope, session: false })(req, res, next);
  });
  router.get(
    `/${name}/callback`,
    (req, res, next) => {
      if (!passport._strategy(name)) return res.redirect('/?error=oauth_not_configured');
      passport.authenticate(name, { session: false, failureRedirect: '/?error=oauth_failed' })(req, res, next);
    },
    oauthSuccess
  );
}
providerRoutes('google', ['profile', 'email']);
providerRoutes('github', ['user:email']);

module.exports = router;
