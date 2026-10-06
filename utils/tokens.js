const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

const REFRESH_DAYS = 7;
const COOKIE_NAME = 'refreshToken';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

const signAccessToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: '15m'
  });

// Creates a refresh token, stores its hash, returns the raw token
async function createRefreshToken(user, family = crypto.randomUUID()) {
  const token = jwt.sign(
    { id: user._id.toString(), jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: `${REFRESH_DAYS}d` }
  );
  await RefreshToken.create({
    user: user._id,
    tokenHash: sha256(token),
    family,
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
  });
  return { token, family };
}

const cookieOptions = {
  httpOnly: true,
  secure: true,          // required by the assignment (works on HTTPS and on localhost)
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000
};

const setRefreshCookie = (res, token) => res.cookie(COOKIE_NAME, token, cookieOptions);
const clearRefreshCookie = (res) => {
  const { maxAge, ...opts } = cookieOptions;
  res.clearCookie(COOKIE_NAME, opts);
};

module.exports = {
  COOKIE_NAME,
  sha256,
  signAccessToken,
  createRefreshToken,
  setRefreshCookie,
  clearRefreshCookie
};
