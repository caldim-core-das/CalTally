const { sequelize, User } = require('./models');

// Test what happens if we dynamically set the schema
User.options.schema = 'identity_tenant';

// Print the CREATE TABLE sql
async function test() {
  try {
    await User.sync({ force: false, logging: console.log });
  } catch (e) {
    console.error(e.message);
  }
}
test();
