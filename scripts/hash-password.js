// Usage: node scripts/hash-password.js "the-password-you-want"
// Prints a bcrypt hash to paste into DASHBOARD_USERS.
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js "your-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
