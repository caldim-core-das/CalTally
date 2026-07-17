const { sequelize } = require('./backend/models');
async function run() {
  try {
    await sequelize.query("SET SESSION app.current_tenant_id TO 'admin_bypass'");
    const [res] = await sequelize.query(`INSERT INTO "Companies" ("id","name","financialYearStart","createdAt","updatedAt") VALUES (gen_random_uuid(), 'Test2', '2025-04-01', NOW(), NOW()) RETURNING id`);
    const cid = res[0].id;
    await sequelize.query(`INSERT INTO "Groups" ("id","name","nature","category","CompanyId","createdAt","updatedAt") VALUES (gen_random_uuid(), 'Capital Account', 'Liabilities', 'Primary', '${cid}', NOW(), NOW())`);
    console.log('OK');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
run();
