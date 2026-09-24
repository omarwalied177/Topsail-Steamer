// Staff accounts for the Topsail dashboard.
//
// Passwords are stored as bcrypt HASHES, never plain text, and they live in
// an environment variable (not committed to git) — see .env.example.
//
// DASHBOARD_USERS should be a JSON array like:
// [{"email":"amal@topsailsteamer.com","name":"Amal","passwordHash":"$2a$..."}]
//
// Generate a hash for a new user with:
//   node scripts/hash-password.js "the-password"

export type DashboardUser = {
  email: string;
  name: string;
  passwordHash: string;
};

export function getUsers(): DashboardUser[] {
  const raw = process.env.DASHBOARD_USERS;
  if (!raw) {
    throw new Error(
      "DASHBOARD_USERS environment variable is not set. See .env.example."
    );
  }
  try {
    return JSON.parse(raw) as DashboardUser[];
  } catch {
    throw new Error(
      "DASHBOARD_USERS is not valid JSON. Check your environment variable."
    );
  }
}

export function findUser(email: string): DashboardUser | undefined {
  return getUsers().find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}
