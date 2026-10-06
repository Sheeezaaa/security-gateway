const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { authenticate, checkRole } = require('../middleware/auth');

const router = express.Router();

// SuperAdmin only: list users (handy for demos)
router.get('/', authenticate, checkRole(['SuperAdmin']), async (req, res) => {
  const users = await User.find().select('name email role provider createdAt');
  res.json({ count: users.length, users });
});

// SuperAdmin only
router.delete('/:id', authenticate, checkRole(['SuperAdmin']), async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ message: 'Invalid user id' });
  if (id === req.user.id)
    return res.status(400).json({ message: 'You cannot delete your own account' });

  const user = await User.findByIdAndDelete(id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  await RefreshToken.deleteMany({ user: id });
  res.json({ message: 'User deleted', id });
});

module.exports = router;
