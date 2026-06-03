/**
 * backfill_invoice_ledger_links.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time backfill: links existing Sales Invoice and Purchase Bill journal
 * entries to the correct individual customer/vendor ledgers.
 *
 * PROBLEM: Old invoices/bills may have been posted with a group-level ledger
 * (e.g. the "Sundry Debtors" group ledger) instead of the specific customer
 * ledger. This script re-points those transactions.
 *
 * RUN:
 *   node backend/scratch/backfill_invoice_ledger_links.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path');
const backendDir = path.join(__dirname, '..');

const { SalesInvoice, Voucher, Transaction, Ledger, Group, sequelize } = require(path.join(backendDir, 'models'));
const { Op } = require('sequelize');

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find a customer's ledger:
 *   1. Use the ledgerId on the SalesInvoice (customerLedgerId) — it IS the ledger
 *   2. Verify it's under Sundry Debtors
 */
async function resolveCustomerLedger(customerLedgerId, companyId) {
  if (!customerLedgerId) return null;
  // customerLedgerId IS the customer ledger in our architecture
  const ledger = await Ledger.findOne({
    where: { id: customerLedgerId, CompanyId: companyId },
    include: [{ model: Group, attributes: ['name', 'nature'] }]
  });
  return ledger || null;
}

/**
 * Find a vendor's ledger from a bill's supplier ledger ID.
 * In our architecture, supplierLedgerId is the vendor ledger directly.
 * We extract it from the voucher's credit transaction.
 */
async function resolveVendorLedgerFromVoucher(voucher, companyId) {
  // Find the credit transaction (vendor is credited in a purchase)
  const crTx = voucher.Transactions?.find(t => parseFloat(t.credit || 0) > 0);
  if (!crTx) return null;

  // Check if this ledger is under Sundry Creditors
  const ledger = await Ledger.findOne({
    where: { id: crTx.LedgerId, CompanyId: companyId },
    include: [{ model: Group, attributes: ['name', 'nature'] }]
  });

  if (!ledger) return null;

  // If already correctly under Sundry Creditors (individual vendor ledger), it's fine
  const groupName = ledger.Group?.name || '';
  if (groupName.toLowerCase().includes('creditor') || groupName.toLowerCase().includes('vendor')) {
    return { ledger, txId: crTx.id, alreadyLinked: true };
  }

  return { ledger, txId: crTx.id, alreadyLinked: false };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let invoiceLinked = 0;
  let billLinked = 0;
  let skipped = 0;

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('BACKFILL: Invoice & Bill Ledger Links');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // ── PART 1: Sales Invoices ────────────────────────────────────────────────
    console.log('── PART 1: Sales Invoices ──────────────────────────────');

    const invoices = await SalesInvoice.findAll({
      where: {
        status: { [Op.notIn]: ['Draft', 'Void'] },
        VoucherId: { [Op.ne]: null }
      }
    });

    console.log(`Found ${invoices.length} confirmed invoice(s) to check.\n`);

    for (const invoice of invoices) {
      const companyId = invoice.CompanyId;
      const customerLedgerId = invoice.customerLedgerId;

      if (!customerLedgerId) {
        console.log(`  [SKIP] Invoice ${invoice.invoiceNumber} — no customerLedgerId`);
        skipped++;
        continue;
      }

      // Verify the customer ledger exists
      const customerLedger = await resolveCustomerLedger(customerLedgerId, companyId);
      if (!customerLedger) {
        console.log(`  [SKIP] Invoice ${invoice.invoiceNumber} — customerLedger ${customerLedgerId} not found`);
        skipped++;
        continue;
      }

      // Find voucher + transactions
      const voucher = await Voucher.findByPk(invoice.VoucherId, {
        include: [{ model: Transaction }]
      });

      if (!voucher || !voucher.Transactions) {
        console.log(`  [SKIP] Invoice ${invoice.invoiceNumber} — voucher not found`);
        skipped++;
        continue;
      }

      // Find the debit transaction(s) for this invoice
      // The debit side should be the customer (Accounts Receivable)
      const debitTxs = voucher.Transactions.filter(t => parseFloat(t.debit || 0) > 0);

      let updated = false;
      for (const tx of debitTxs) {
        if (String(tx.LedgerId) === String(customerLedgerId)) {
          // Already pointing to the correct customer ledger
          continue;
        }

        // Check if it's pointing to a group-level Sundry Debtors ledger
        const currentLedger = await Ledger.findOne({
          where: { id: tx.LedgerId },
          include: [{ model: Group, attributes: ['name'] }]
        });

        const isGroupLedger = currentLedger?.Group?.name?.toLowerCase().includes('debtor') &&
                               currentLedger?.name?.toLowerCase().includes('debtor');

        if (isGroupLedger || !tx.LedgerId) {
          await tx.update({ LedgerId: customerLedgerId });
          console.log(`  ✅ Invoice ${invoice.invoiceNumber || invoice.id} → linked to ledger: ${customerLedger.name}`);
          updated = true;
          invoiceLinked++;
        }
      }

      if (!updated) {
        skipped++;
      }
    }

    // ── PART 2: Purchase Bills ────────────────────────────────────────────────
    console.log('\n── PART 2: Purchase Bills ──────────────────────────────');

    const billVouchers = await Voucher.findAll({
      where: {
        voucherType: 'Purchase',
        status: { [Op.notIn]: ['Void', 'Draft'] }
      },
      include: [{ model: Transaction, include: [{ model: Ledger, include: [{ model: Group, attributes: ['name', 'nature'] }] }] }]
    });

    console.log(`Found ${billVouchers.length} purchase voucher(s) to check.\n`);

    for (const voucher of billVouchers) {
      const companyId = voucher.CompanyId;

      // The credit transaction should be the vendor
      const crTxs = voucher.Transactions?.filter(t => parseFloat(t.credit || 0) > 0) || [];

      for (const crTx of crTxs) {
        const currentLedger = crTx.Ledger;
        if (!currentLedger) {
          skipped++;
          continue;
        }

        const groupName = currentLedger.Group?.name || '';
        const isGroupLedger = groupName.toLowerCase().includes('creditor') &&
                               currentLedger.name.toLowerCase().includes('creditor') &&
                               !currentLedger.firstName && !currentLedger.lastName && !currentLedger.companyName;

        if (!isGroupLedger) {
          // Already a specific vendor ledger — skip
          skipped++;
          continue;
        }

        // Try to find the actual vendor ledger by matching the narration or other means
        // Extract vendor name from narration if possible
        let vendorName = null;
        try {
          const parsed = JSON.parse(voucher.narration || '{}');
          vendorName = parsed.vendor || parsed.supplierName || null;
        } catch (e) { /* narration not JSON */ }

        if (vendorName) {
          const vendorLedger = await Ledger.findOne({
            where: {
              name: { [Op.like]: `%${vendorName}%` },
              CompanyId: companyId
            },
            include: [{ model: Group, where: { name: { [Op.like]: '%Creditor%' } } }]
          });

          if (vendorLedger && String(vendorLedger.id) !== String(currentLedger.id)) {
            await crTx.update({ LedgerId: vendorLedger.id });
            console.log(`  ✅ Bill ${voucher.voucherNumber || voucher.id} → linked to ledger: ${vendorLedger.name}`);
            billLinked++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      }
    }

    console.log('\n══════════════════════════════════════════════════════');
    console.log('Backfill complete:');
    console.log(`  ✅ ${invoiceLinked} invoice transaction(s) linked to customer ledgers`);
    console.log(`  ✅ ${billLinked} bill transaction(s) linked to vendor ledgers`);
    console.log(`  ⏭  ${skipped} skipped (already linked, no ledger found, or no change needed)`);
    console.log('══════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ Backfill failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  process.exit(0);
}

main();
