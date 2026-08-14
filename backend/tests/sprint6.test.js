const assert = require('assert');
const NotificationService = require('../modules/financial-closing/services/NotificationService');
const ClosingScheduler = require('../modules/financial-closing/scheduler/ClosingScheduler');
const { Company, AppNotification } = require('../models');

async function runSprint6Tests() {
  const logs = [];
  const log = (msg) => {
    console.log(`[TEST-LOG-SPRINT6] ${msg}`);
    logs.push(`${new Date().toISOString()} - ${msg}`);
  };

  log('Starting Sprint 6 Schedulers & Notifications Tests...');

  try {
    const company = await Company.findOne();
    if (!company) {
      log('No company record found, skipping execution tests');
      return;
    }

    const companyId = company.id;

    // 1. Dispatch Notification Check
    log('Test 1: Triggering test AppNotification for FCCF alerts...');
    const notif = await NotificationService.triggerNotification({
      companyId,
      message: 'UAT Scheduler Check: Compliance report calculations ready for lock.',
      type: 'INFO',
      actionLink: '/financial-closing/wizard'
    });

    assert.ok(notif.id, 'Notification created successfully');
    assert.strictEqual(notif.type, 'INFO', 'Notification type is INFO');
    assert.strictEqual(notif.isRead, false, 'New notifications are marked unread');
    log('AppNotification triggered and saved successfully!');

    // 2. Scheduler Check
    log('Test 2: Initializing background cron schedules...');
    ClosingScheduler.initialize();
    log('Scheduler initialization complete!');

    log('✅ SPRINT 6 SCHEDULER & NOTIFICATION TESTS COMPLETED SUCCESSFULLY!');
    require('fs').writeFileSync('sprint6_test_results.log', logs.join('\n') + '\nSUCCESS\n');
  } catch (err) {
    log(`❌ SPRINT 6 TEST FAILED: ${err.message}`);
    log(err.stack);
    require('fs').writeFileSync('sprint6_test_results.log', logs.join('\n') + `\nFAILURE: ${err.message}\n${err.stack}\n`);
  }
}

module.exports = runSprint6Tests;
