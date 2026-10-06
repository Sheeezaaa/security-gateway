const express = require('express');
const { authenticate, checkRole } = require('../middleware/auth');

const router = express.Router();

// Manager and SuperAdmin only
router.post('/approve', authenticate, checkRole(['Manager', 'SuperAdmin']), (req, res) => {
  res.json({
    message: 'Payroll approved successfully',
    approvedBy: req.user.id,
    role: req.user.role,
    payload: req.body
  });
});

module.exports = router;
