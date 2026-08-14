const { sequelize } = require('./backend/models');
sequelize.query(`SELECT tgname FROM pg_trigger WHERE tgrelid::regclass::text = '"Groups"'`).then(console.log).finally(() => process.exit());
