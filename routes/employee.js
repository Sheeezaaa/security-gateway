const express = require('express');
const User = require('../models/User');
const { authenticate, checkRole } = require('../middleware/auth');

const router = express.Router();

// All authenticated roles
router.get('/profile', authenticate, checkRole(['SuperAdmin', 'Manager', 'Employee']), async (req, res) => {
  const user = await User.findById(req.user.id).select('-password -failedAttempts -lockUntil');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'Employee profile', user });
});

module.exports = router;
