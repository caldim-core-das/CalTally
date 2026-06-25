const axios = require('axios');

async function test() {
  try {
    // We don't know Naveen's password, but we know the admin's.
    // Or we can just bypass the HTTP request and query the DB directly to check if there is an issue with the query.
    // But wait, the issue is likely just nodemon not restarting.
    // Let me query the user directly to verify his role.
    const { User, Company } = require('./models');
    
    // Find the latest user
    const users = await User.findAll({ order: [['createdAt', 'DESC']], limit: 1 });
    console.log('Latest user:', users[0].email, 'Role:', users[0].role);

  } catch (e) {
    console.error(e);
  }
}
test();
