require('dotenv').config();
const { Ledger, Group } = require('./models');

async function listLedgers() {
  try {
    // Use the company ID for Sri Lakshmi Traders
    const companyId = '76995c20-4799-4af8-9bdb-4ddf0de1370d';
    
    const ledgers = await Ledger.findAll({ 
      where: { CompanyId: companyId },
      include: [{ model: Group, attributes: ['name'] }],
      order: [['name', 'ASC']]
    });
    
    console.log(`Found ${ledgers.length} ledgers for this company:\n`);
    for (const l of ledgers) {
      console.log(`  - "${l.name}" → Group: "${l.Group?.name || l.groupName || 'N/A'}" | Balance: ₹${l.currentBalance}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

listLedgers();
