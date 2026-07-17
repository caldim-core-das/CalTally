require('dotenv').config();
const { User, Company, UserCompany } = require('./models');

async function fixLinks() {
  try {
    const users = await User.findAll();
    
    for (const u of users) {
      if (u.activeCompanyId) {
        // Check if company exists
        const company = await Company.findByPk(u.activeCompanyId);
        if (company) {
          // Check if link exists
          const existing = await UserCompany.findOne({
            where: { userId: u.id, companyId: company.id }
          });
          
          if (!existing) {
            await UserCompany.create({
              userId: u.id,
              companyId: company.id,
              role: 'SUPER_ADMIN' // Giving them Super Admin back as they are likely owners
            });
            console.log(`Restored link for ${u.email} to company ${company.name}`);
          }
        }
      }
    }

    console.log('Finished restoring links.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixLinks();
