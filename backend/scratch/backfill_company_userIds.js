const { sequelize } = require('../models');

async function run() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    // 1. Backfill from UserCompanies mapping
    console.log('Backfilling company userIds from UserCompanies...');
    const [mappings] = await sequelize.query('SELECT * FROM "UserCompanies"');
    
    for (const mapping of mappings) {
      const [updated] = await sequelize.query(
        `UPDATE "Companies" SET "userId" = :userId WHERE "id" = :companyId AND "userId" IS NULL`,
        {
          replacements: { userId: mapping.userId, companyId: mapping.companyId }
        }
      );
      console.log(`Updated company ${mapping.companyId} with userId ${mapping.userId}`);
    }

    // 2. Also map any other company to thejathangavel5@gmail.com if they are orphans or if they are relevant
    // let's check who the current active user is. thejathangavel5@gmail.com (id: 7af19829-56f3-47e2-840a-686707b8a8b2)
    // Let's set thejathangavel5@gmail.com as the owner of "The MOON Enterprises" if not already set.
    // The MOON Enterprises ID is: 5f028981-8de4-4c19-9a90-54257dd87f70
    const [res] = await sequelize.query(
      `UPDATE "Companies" SET "userId" = '7af19829-56f3-47e2-840a-686707b8a8b2' WHERE "name" = 'The MOON Enterprises'`
    );
    console.log('Explicitly ensured "The MOON Enterprises" is owned by thejathangavel5@gmail.com');

  } catch (err) {
    console.error('Error backfilling:', err);
  } finally {
    await sequelize.close();
  }
}

run();
