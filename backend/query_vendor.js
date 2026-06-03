const sequelize = require('./config/db.config');

async function run() {
    try {
        console.log("Checking all Purchase Vouchers and their Transactions...");
        const [purchaseVtxs] = await sequelize.query(`
            SELECT v.id AS "voucherId", v."voucherNumber", v.date, v.status,
                   t.id AS "txnId", t."LedgerId", l.name AS "ledgerName", l."groupName", t.debit, t.credit
            FROM "Vouchers" v
            JOIN "Transactions" t ON t."VoucherId" = v.id
            JOIN "Ledgers" l ON t."LedgerId" = l.id
            WHERE v."voucherType" = 'Purchase'
            ORDER BY v.date DESC, v.id
        `);
        console.log("Purchase Vouchers with Transactions:", purchaseVtxs);
        
    } catch (err) {
        console.error("Error executing query:", err);
    } finally {
        await sequelize.close();
    }
}
run();
