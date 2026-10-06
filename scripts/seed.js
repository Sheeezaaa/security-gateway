// Creates the 3 test accounts required by the assignment: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

const accounts = [
  { name: 'Super Admin', email: 'superadmin@example.com', password: 'SuperAdmin@123', role: 'SuperAdmin' },
  { name: 'Mary Manager', email: 'manager@example.com', password: 'Manager@123', role: 'Manager' },
  { name: 'Eddie Employee', email: 'employee@example.com', password: 'Employee@123', role: 'Employee' }
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  for (const a of accounts) {
    const hashed = await bcrypt.hash(a.password, 12);
    await User.findOneAndUpdate(
      { email: a.email },
      { name: a.name, email: a.email, password: hashed, role: a.role, provider: 'local', failedAttempts: 0, lockUntil: null },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`Seeded ${a.role}: ${a.email}`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
