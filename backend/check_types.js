const { Ledger } = require('./models');

async function run() {
  try {
    const ledgers = await Ledger.findAll({
      attributes: ['name', 'openingBalance', 'openingBalanceType', 'groupName']
    });
    console.log("Checking ledgers in DB:");
    ledgers.forEach(l => {
      console.log(`- Ledger: ${l.name}, Opening: ${l.openingBalance}, Type: "${l.openingBalanceType}", Group: ${l.groupName}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
