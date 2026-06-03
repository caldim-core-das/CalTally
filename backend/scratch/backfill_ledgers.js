/**
 * backfill_ledgers.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time backfill script.
 *
 * WHAT IT DOES:
 *  1. For every company in the database:
 *     a. Ensures "Current Assets" and "Sundry Debtors" groups exist.
 *     b. Ensures "Current Liabilities" and "Sundry Creditors" groups exist.
 *     c. Finds every Ledger whose groupName column is 'Sundry Debtors' or
 *        'Sundry Creditors' but whose GroupId is NULL (failed to link on create).
 *     d. Creates ledgers for old-style customers/vendors stored via the
 *        getCustomers/getVendors filter (those already have GroupId set, so
 *        step c covers the gap).
 *
 * WHAT IT DOES NOT DO:
 *  - Does NOT touch any existing correctly-linked ledger.
 *  - Does NOT create duplicate ledgers.
 *
 * RUN:
 *   node backend/scratch/backfill_ledgers.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const path = require('path');
const backendDir = path.join(__dirname, '..');

const { Company, Group, Ledger } = require(path.join(backendDir, 'models'));
const { Op } = require('sequelize');

// ── Standard group metadata ──────────────────────────────────────────────────
const GROUP_META = {
  'Sundry Debtors':   { nature: 'Assets',      parentName: 'Current Assets',      parentNature: 'Assets',      category: 'Sub-Group' },
  'Sundry Creditors': { nature: 'Liabilities',  parentName: 'Current Liabilities', parentNature: 'Liabilities', category: 'Sub-Group' },
};

// ── Helper: find or create a group ──────────────────────────────────────────
async function findOrCreate(name, companyId, nature, category, parentId = null) {
  let g = await Group.findOne({ where: { name, CompanyId: companyId } });
  if (g) return g;
  console.log(`  [CREATE GROUP] "${name}" for company ${companyId}`);
  g = await Group.create({ name, nature, category, parent_id: parentId, CompanyId: companyId });
  return g;
}

async function ensureGroups(companyId) {
  const result = {};
  for (const [groupName, meta] of Object.entries(GROUP_META)) {
    // Ensure parent first
    const parent = await findOrCreate(
      meta.parentName,
      companyId,
      meta.parentNature,
      'Primary',
      null
    );
    // Ensure the sub-group
    const grp = await findOrCreate(
      groupName,
      companyId,
      meta.nature,
      meta.category,
      parent.id
    );
    result[groupName] = grp;
  }
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let totalFixed = 0;
  let totalSkipped = 0;

  try {
    const companies = await Company.findAll();
    console.log(`\nBackfill starting — found ${companies.length} company(ies).\n`);

    for (const company of companies) {
      console.log(`\n─── Company: ${company.name} (${company.id})`);

      // 1. Ensure Sundry Debtors and Sundry Creditors groups exist
      const groups = await ensureGroups(company.id);

      // 2. Find ledgers with groupName set but GroupId is NULL
      //    (these were created before the auto-create fix landed)
      const orphanedLedgers = await Ledger.findAll({
        where: {
          CompanyId: company.id,
          GroupId: null,
          groupName: { [Op.in]: ['Sundry Debtors', 'Sundry Creditors'] }
        }
      });

      if (orphanedLedgers.length > 0) {
        console.log(`  Found ${orphanedLedgers.length} orphaned ledger(s) with NULL GroupId:`);
        for (const ledger of orphanedLedgers) {
          const targetGroup = groups[ledger.groupName];
          if (targetGroup) {
            await ledger.update({ GroupId: targetGroup.id });
            console.log(`  ✅ Linked "${ledger.name}" → ${ledger.groupName} (${targetGroup.id})`);
            totalFixed++;
          }
        }
      } else {
        console.log(`  ✔ No orphaned ledgers found (all GroupIds are set).`);
      }

      // 3. Check for ledgers in Sundry Debtors/Creditors groups — just report
      const debtorGroup  = groups['Sundry Debtors'];
      const creditorGroup = groups['Sundry Creditors'];

      const debtorCount  = await Ledger.count({ where: { CompanyId: company.id, GroupId: debtorGroup.id } });
      const creditorCount = await Ledger.count({ where: { CompanyId: company.id, GroupId: creditorGroup.id } });
      console.log(`  📊 Sundry Debtors ledgers:   ${debtorCount}`);
      console.log(`  📊 Sundry Creditors ledgers: ${creditorCount}`);
      totalSkipped += (debtorCount + creditorCount) - orphanedLedgers.length;
    }

    console.log('\n══════════════════════════════════════════');
    console.log('Backfill complete.');
    console.log(`  ✅ ${totalFixed}  ledger(s) fixed (GroupId was NULL, now linked)`);
    console.log(`  ⏭  ${Math.max(0, totalSkipped)} ledger(s) skipped (already had correct GroupId)`);
    console.log('══════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ Backfill failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  process.exit(0);
}

main();
