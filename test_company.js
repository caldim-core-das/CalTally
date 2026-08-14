const { sequelize, Company, User, Group, Ledger } = require('./backend/models');
const companyController = require('./backend/modules/company/company.controller');

async function test() {
  try {
    const user = await User.findOne();
    const req = {
      body: {
        name: 'Test Company',
        financialYearStart: '2025-04-01',
        state: 'Tamil Nadu',
        panNumber: 'TUVWX5678Y',
        isGstRegistered: 'Yes',
        gstNumber: '33TUVWX5678Y1Z6'
      },
      user: { id: user ? user.id : null }
    };
    const res = {
      status: (code) => ({ json: (data) => console.log('Response:', code, data) }),
      json: (data) => console.log('Response: 200', data)
    };
    const next = (err) => {
        console.error('Next called with error:');
        console.error(err);
    };
    
    // Enable global query logging
    sequelize.options.logging = console.log;
    
    await companyController.createCompany(req, res, next);
  } catch (e) {
    console.error('Unhandled error:', e);
  } finally {
    process.exit();
  }
}

test();
