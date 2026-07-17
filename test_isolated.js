const { sequelize, Company, User, CompanyUser, Group } = require('./backend/models');

async function run() {
  const t = await sequelize.transaction();
  try {
    // 1. Company
    const company = await Company.create({ name: 'Test', financialYearStart: '2025-04-01' }, { transaction: t });
    console.log('Company created');

    // 2. User
    const user = await User.findOne({ transaction: t });
    console.log('User found');

    // 3. UserCompany
    await sequelize.models.UserCompany.create({ role: 'ADMIN', userId: user.id, companyId: company.id }, { transaction: t });
    console.log('UserCompany created');

    // 4. User update
    user.activeCompanyId = company.id;
    await user.save({ transaction: t });
    console.log('User updated');

    // 5. Group create (This is where it fails!)
    await Group.create({ name: 'Capital Account', nature: 'Liabilities', category: 'Primary', CompanyId: company.id }, { transaction: t });
    console.log('Group created');

    await t.commit();
    console.log('Success');
  } catch (err) {
    console.error('FAILED AT:', err.sql || err.message);
    console.error('FULL ERROR:', err);
    await t.rollback();
  } finally {
    process.exit();
  }
}
run();
