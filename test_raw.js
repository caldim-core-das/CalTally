const { sequelize, Company } = require('./backend/models'); 

sequelize.transaction().then(async (t) => { 
  try { 
    await sequelize.query("SET LOCAL app.current_tenant_id TO 'admin_bypass'", { transaction: t }); 
    const [results] = await sequelize.query(`INSERT INTO "Companies" ("id","name","financialYearStart","createdAt","updatedAt") VALUES (gen_random_uuid(), 'Test', '2025-04-01', NOW(), NOW()) RETURNING id`, { transaction: t }); 
    const companyId = results[0].id;
    console.log('Company:', companyId); 
    
    await sequelize.query(`INSERT INTO "Groups" ("id","name","nature","category","CompanyId","createdAt","updatedAt") VALUES (gen_random_uuid(), 'Capital Account', 'Liabilities', 'Primary', '${companyId}', NOW(), NOW())`, { transaction: t }); 
    console.log('Group inserted successfully'); 
    await t.rollback(); 
  } catch(e) { 
    console.error('Error:', e); 
    await t.rollback(); 
  } finally { 
    process.exit(); 
  } 
});
