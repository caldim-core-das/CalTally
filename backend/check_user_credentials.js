const { User } = require('./models');
const fs = require('fs');
const path = require('path');

async function run() {
  const logPath = path.join(__dirname, 'users_check.log');
  try {
    const users = await User.findAll({
      attributes: ['id', 'email', 'name', 'password', 'role', 'oauthOnly', 'isEmailVerified']
    });
    let output = `Found ${users.length} users in DB:\n`;
    users.forEach(u => {
      output += `- ID: ${u.id}\n  Email: ${u.email}\n  Name: ${u.name}\n  Role: ${u.role}\n  OAuthOnly: ${u.oauthOnly}\n  Verified: ${u.isEmailVerified}\n  PasswordHash: ${u.password}\n\n`;
    });
    fs.writeFileSync(logPath, output);
  } catch (err) {
    fs.writeFileSync(logPath, `ERROR: ${err.message}\n${err.stack}\n`);
  }
}

run();
