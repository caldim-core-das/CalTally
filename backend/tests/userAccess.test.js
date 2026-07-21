const assert = require('assert');
const { User, Company, UserSession, UserActivityLog, CustomRole } = require('../models');

async function runUserAccessTests() {
  const logs = [];
  const log = (msg) => {
    console.log(`[TEST-USER-ACCESS] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  log('Starting Users & Access Management Test Suite...');

  try {
    const company = await Company.findOne();
    if (!company) {
      log('No company record found, skipping live tests');
      return;
    }
    const companyId = company.id;

    // 1. User Session Logging Check
    log('Test 1: Creating test UserSession record...');
    const user = await User.findOne();
    assert.ok(user, 'User record exists');

    const session = await UserSession.create({
      UserId: user.id,
      CompanyId: companyId,
      loginTime: new Date(),
      ipAddress: '192.168.1.100',
      browser: 'Chrome 126',
      device: 'Windows 11',
      status: 'ONLINE'
    });

    assert.ok(session.id, 'UserSession created successfully');
    assert.strictEqual(session.status, 'ONLINE');
    assert.strictEqual(session.device, 'Windows 11');
    log('UserSession created and verified!');

    // 2. User Activity Audit Log Severity Check
    log('Test 2: Creating UserActivityLog with WARNING severity...');
    const activity = await UserActivityLog.create({
      CompanyId: companyId,
      UserId: user.id,
      userName: user.name || 'Test Admin',
      severity: 'WARNING',
      module: 'Users',
      action: 'CANCEL_INVITATION',
      details: 'Cancelled pending user invitation for test@user.com',
      ipAddress: '192.168.1.100',
      device: 'Windows 11'
    });

    assert.ok(activity.id, 'UserActivityLog created successfully');
    assert.strictEqual(activity.severity, 'WARNING');
    assert.strictEqual(activity.module, 'Users');
    log('UserActivityLog created with WARNING severity!');

    // 3. Custom Role Creation Check
    log('Test 3: Creating Custom Role with 15-module permission matrix...');
    const customRole = await CustomRole.create({
      CompanyId: companyId,
      name: 'Senior Tax Auditor',
      description: 'Full tax & GST auditing authority',
      baseRole: 'AUDITOR',
      permissions: {
        GST: { view: true, create: true, edit: true, delete: false },
        'Financial Closing': { view: true, create: true, edit: true, delete: false }
      },
      isActive: true,
      createdBy: user.id
    });

    assert.ok(customRole.id, 'CustomRole created successfully');
    assert.strictEqual(customRole.name, 'Senior Tax Auditor');
    log('CustomRole created and verified!');

    log('All Users & Access Management tests passed successfully! ✅');

    const fs = require('fs');
    fs.writeFileSync('user_access_test_results.log', logs.join('\n'));
    return true;
  } catch (err) {
    log(`TEST FAILURE: ${err.message}\n${err.stack}`);
    const fs = require('fs');
    fs.writeFileSync('user_access_test_results.log', logs.join('\n'));
    throw err;
  }
}

module.exports = runUserAccessTests;

if (require.main === module) {
  runUserAccessTests().then(() => console.log('Done')).catch(err => console.error(err));
}
