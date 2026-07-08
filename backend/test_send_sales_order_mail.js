const db = require('./models');
const { sendEmail } = require('./modules/mail/mail.controller');

(async () => {
    try {
        await db.sequelize.sync();
        
        // Find any sales order
        const order = await db.SalesOrder.findOne({ order: [['createdAt', 'DESC']] });
        if (!order) return console.log('No sales order found');

        const req = {
            user: { id: order.CreatedBy }, // Mock user
            body: {
                toEmail: 'test@example.com',
                subject: 'Test Subject',
                body: 'Test Body',
                ledgerId: order.LedgerId,
                companyId: order.CompanyId,
                type: 'Sales Order',
                documentId: order.id
            }
        };

        const res = {
            status: (code) => ({
                json: (data) => console.log('Response:', code, data)
            })
        };

        const next = (err) => console.error('Next error:', err);

        console.log('Invoking sendEmail...');
        await sendEmail(req, res, next);
        
        // Wait a few seconds for setImmediate background processing to finish
        setTimeout(async () => {
            console.log('Checking SystemMail records...');
            const mails = await db.SystemMail.findAll({ order: [['createdAt', 'DESC']], limit: 1 });
            console.log(JSON.stringify(mails, null, 2));
            process.exit(0);
        }, 3000);

    } catch (err) {
        console.error('Test script crashed:', err);
    }
})();
