const sequelize = require('./config/db.config');

const SQL = `
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "CreatedBy" UUID;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ModifiedBy" UUID;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "role" VARCHAR(255) DEFAULT 'ADMIN';
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "activeCompanyId" UUID;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "oauthOnly" BOOLEAN DEFAULT false;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "pendingEmail" VARCHAR(255);
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isEmailVerified" BOOLEAN DEFAULT false;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emailVerificationToken" VARCHAR(255);
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "resetPasswordToken" VARCHAR(255);
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "resetPasswordExpiry" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "department" VARCHAR(255) DEFAULT 'Accounts';
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'ACTIVE';
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "notificationPreferences" JSON;
`;

async function runMigration() {
  try {
    console.log('Connecting to DB via Sequelize...');
    await sequelize.authenticate();
    console.log('Connected. Running ALTER TABLE for Users...');

    await sequelize.query(SQL);

    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Users';
    `);

    console.log('Columns in Users table:', results.map(r => r.column_name));
    console.log('Success!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
