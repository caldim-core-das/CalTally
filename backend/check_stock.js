const { Item, StockMovement, sequelize } = require('./models');

async function check() {
  const items = await Item.findAll({ where: { name: 'Laptop' } });
  for (const item of items) {
    console.log(`Item: ${item.name}, currentStock: ${item.currentStock}, openingStock: ${item.openingStock}`);
    const movements = await StockMovement.findAll({ where: { ItemId: item.id }, raw: true });
    console.log(`Movements for ${item.name}:`, movements);
    
    // Also calculate the sum exactly as the hook does
    const totalStock = await StockMovement.sum('quantity', { where: { ItemId: item.id } });
    console.log(`Computed Sum: ${totalStock}`);
  }
}

check().then(() => process.exit(0)).catch(e => console.error(e));
