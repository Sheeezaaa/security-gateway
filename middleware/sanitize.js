const xss = require('xss');

// Keys we never HTML-escape (hashing handles them safely)
const SKIP_VALUE_ESCAPE = ['password'];

function clean(value, key) {
  if (typeof value === 'string') {
    return SKIP_VALUE_ESCAPE.includes(key) ? value : xss(value).trim();
  }
  if (Array.isArray(value)) return value.map((v) => clean(v, key));
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) {
      // Strip NoSQL operator keys ($gt, $ne, ...) and dotted paths
      if (k.startsWith('$') || k.includes('.')) continue;
      out[k] = clean(value[k], k);
    }
    return out;
  }
  return value;
}

// Protects against NoSQL injection + XSS in body, query and params
module.exports = (req, res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};
