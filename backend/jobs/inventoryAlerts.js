const cron = require('node-cron');
const { Op } = require('sequelize');
const { Item, AppNotification, Company, sequelize } = require('../models');

// Run everyday at 9:00 AM
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('[CRON] Starting daily inventory reorder check...');
    
    // Find all items where currentStock <= reorderLevel and reorderLevel > 0
    const lowStockItems = await Item.findAll({
      where: {
        reorderLevel: {
          [Op.gt]: 0
        },
        currentStock: {
          [Op.lte]: sequelize.col('reorderLevel')
        }
      }
    });

    if (lowStockItems.length === 0) {
      console.log('[CRON] No low stock items found.');
      return;
    }

    // Group items by company
    const companyItems = {};
    for (const item of lowStockItems) {
      if (!companyItems[item.CompanyId]) {
        companyItems[item.CompanyId] = [];
      }
      companyItems[item.CompanyId].push(item);
    }

    // Create an AppNotification for each company
    for (const [companyId, items] of Object.entries(companyItems)) {
      const message = `Stock Alert: You have ${items.length} item(s) below their reorder level. Please check your inventory and restock. (e.g. ${items.slice(0, 3).map(i => i.name).join(', ')}${items.length > 3 ? '...' : ''})`;
      
      await AppNotification.create({
        CompanyId: companyId,
        message: message,
        type: 'WARNING',
        actionLink: '/inventory?tab=restock'
      });
      console.log(`[CRON] Created low stock notification for company ${companyId}`);
    }

    console.log('[CRON] Inventory reorder check complete.');
  } catch (error) {
    console.error('[CRON] Failed to run inventory reorder check:', error);
  }
});
