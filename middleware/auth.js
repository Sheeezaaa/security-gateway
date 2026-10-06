const jwt = require('jsonwebtoken');

// Verifies the "Authorization: Bearer <accessToken>" header
exports.authenticate = (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired access token' });
  }
};

// RBAC: checkRole(['SuperAdmin', 'Manager'])
exports.checkRole = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: 'Forbidden: your role is not allowed to access this resource',
      yourRole: req.user ? req.user.role : null,
      requiredRoles: allowedRoles
    });
  }
  next();
};
