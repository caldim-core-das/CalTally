const { StockMovement, Item, sequelize } = require('./models');

async function fix() {
  const sm = await StockMovement.findOne({ where: { quantity: -1, movementType: 'SALE' } });
  if (sm) {
    console.log(`Found orphaned StockMovement, deleting:`, sm.id);
    await sm.destroy();
    console.log(`Deleted successfully. Inventory hook should have updated the item stock.`);
  } else {
    console.log(`Not found.`);
  }

  const items = await Item.findAll({ where: { name: 'Laptop' } });
  for (const item of items) {
    console.log(`Item: ${item.name}, currentStock: ${item.currentStock}`);
  }
}

fix().then(() => process.exit(0)).catch(e => console.error(e));
