const eventBus = require('./core/EventBus');

console.log('--- EA Blueprint Vol 2: Event Bus Integration Test ---');

// 1. Setup Listeners (Simulating other contexts)
eventBus.subscribe('INVOICE_CREATED', 'TestInvoiceWorker', async (event) => {
    console.log('[IntegrationGateway Context] Received INVOICE_CREATED event.');
    console.log(`  -> Processing Invoice ID: ${event.payload.invoiceId}`);
    console.log(`  -> Status: ${event.payload.status}, Amount: ${event.payload.totalAmount}`);
});

eventBus.subscribe('VOUCHER_POSTED', 'TestVoucherWorker', async (event) => {
    console.log('[Reporting Context] Received VOUCHER_POSTED event.');
    console.log(`  -> Updating materialized views for Voucher ID: ${event.payload.voucherId}`);
});

// 2. Simulate Core Module Actions
console.log('\n[Receivables Context] Simulating Invoice Creation...');
eventBus.publish('INVOICE_CREATED', {
    invoiceId: 'INV-2026-001',
    companyId: 1,
    totalAmount: 1500.50,
    status: 'Confirmed'
}, { userId: 42, tenantId: 1 });

console.log('\n[Ledger Context] Simulating Journal Entry Posting...');
eventBus.publish('VOUCHER_POSTED', {
    voucherId: 'VOUCH-8822',
    companyId: 1,
    voucherType: 'Journal',
    amount: 5000.00
}, { userId: 42, tenantId: 1 });

console.log('\n--- Test Suite Complete ---');
