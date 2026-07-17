const { sequelize, User, Company, Employee } = require('./models');

async function test() {
  console.log('Company getTableName():', Company.getTableName());
  console.log('Company tableName:', Company.tableName);
  console.log('Company options.schema:', Company.options.schema);

  console.log('Employee getTableName():', Employee.getTableName());
  
  const assoc = Employee.associations['Company'];
  console.log('Employee -> Company association target tableName:', assoc.target.tableName);

  // Fix:
  Object.values(require('./models')).forEach(m => {
    if (m && m.tableName && typeof m.tableName === 'string' && m.options && m.options.schema) {
      m.tableName = m.getTableName();
    }
  });

  const queryInterface = sequelize.getQueryInterface();
  const sql = queryInterface.queryGenerator.createTableQuery(Employee.getTableName(), queryInterface.queryGenerator.attributesToSQL(Employee.getAttributes(), { context: 'createTable' }), Employee.options);
  console.log('SQL:', sql);
}
test();
