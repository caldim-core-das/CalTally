const { Item, SalesInvoice, SalesInvoiceItem, StockMovement, Godown, Company, User } = require('../../../models');
const { Op, Sequelize } = require('sequelize');

class ProductRegistersController {
  /**
   * Helper to resolve date range from preset or custom query params
   */
  static _getDateRange(query) {
    const { period = 'ALL_TIME', fromDate, toDate, month, year } = query;
    const now = new Date();
    let start, end;

    if (month && year) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      start = new Date(y, m - 1, 1);
      end = new Date(y, m, 0, 23, 59, 59, 999);
      return { start, end };
    }

    if (fromDate && toDate) {
      start = new Date(fromDate);
      end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    switch (period) {
      case 'PREVIOUS_MONTH':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'THIS_QUARTER': {
        const qMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), qMonth, 1);
        end = new Date(now.getFullYear(), qMonth + 3, 0, 23, 59, 59, 999);
        break;
      }
      case 'HALF_YEAR':
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'FINANCIAL_YEAR': {
        const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        start = new Date(fyStartYear, 3, 1); // April 1st
        end = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999); // March 31st
        break;
      }
      case 'ALL_TIME':
      case 'ALL':
        start = new Date('2020-01-01');
        end = new Date('2035-12-31');
        break;
      case 'THIS_MONTH':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
    }

    return { start, end };
  }

  /**
   * GET /api/v1/reports/product-registers/sales
   * Sales Product Register grouped strictly by ItemId (UUID)
   */
  static async getSalesRegister(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const { start, end } = ProductRegistersController._getDateRange(req.query);
      const { search, warehouse, minRevenue, minGst } = req.query;

      const itemsWhere = { CompanyId: companyId };
      if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        itemsWhere[Op.or] = [
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Item.name')), { [Op.like]: term }),
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Item.sku')), { [Op.like]: term }),
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Item.hsnCode')), { [Op.like]: term })
        ];
      }

      const allItems = await Item.findAll({
        where: itemsWhere,
        include: [{ model: Godown, as: 'Godown', required: false }]
      });

      const itemMap = Object.fromEntries(allItems.map(i => [i.id, i]));
      const itemIds = allItems.map(i => i.id);

      if (itemIds.length === 0) {
        return res.json({
          period: { start, end },
          items: [],
          totals: { totalInvoices: 0, totalQty: 0, totalTaxable: 0, totalGst: 0, grandTotal: 0 }
        });
      }

      // Query sales invoice line items
      const invoiceWhere = {
        CompanyId: companyId
      };
      const isDateFiltered = req.query.month || (req.query.period !== 'ALL_TIME' && req.query.period !== 'ALL');
      if (isDateFiltered) {
        invoiceWhere.date = { [Op.between]: [start, end] };
      }

      const salesItems = await SalesInvoiceItem.findAll({
        where: { itemId: { [Op.in]: itemIds } },
        include: [{
          model: SalesInvoice,
          where: invoiceWhere,
          attributes: ['id', 'invoiceNumber', 'date', 'customerLedgerId']
        }]
      });

      // Group sales by itemId (UUID)
      const grouped = {};
      salesItems.forEach(si => {
        const itemId = si.itemId;
        if (!grouped[itemId]) {
          grouped[itemId] = {
            itemId,
            invoiceIds: new Set(),
            qtySold: 0,
            taxableValue: 0,
            gstAmount: 0,
            gstRate: si.gstRate || itemMap[itemId]?.taxRate || 18
          };
        }
        const qty = parseFloat(si.quantity) || 0;
        const amt = parseFloat(si.amount) || 0;
        const rate = parseFloat(si.gstRate) || itemMap[itemId]?.taxRate || 18;
        const gst = (amt * rate) / 100;

        grouped[itemId].invoiceIds.add(si.SalesInvoiceId);
        grouped[itemId].qtySold += qty;
        grouped[itemId].taxableValue += amt;
        grouped[itemId].gstAmount += gst;
      });

      // Query Stock Movements for Opening & Closing Stock calculation
      const movements = await StockMovement.findAll({
        where: { ItemId: { [Op.in]: itemIds } }
      });

      const stockCalc = {};
      itemIds.forEach(id => {
        stockCalc[id] = { opening: 0, inward: 0, outward: 0 };
      });

      movements.forEach(m => {
        const id = m.ItemId;
        if (!stockCalc[id]) return;
        const mDate = new Date(m.date);
        const qty = parseFloat(m.quantity) || 0;

        if (mDate < start) {
          stockCalc[id].opening += qty;
        } else if (mDate <= end) {
          if (qty > 0) stockCalc[id].inward += qty;
          else stockCalc[id].outward += Math.abs(qty);
        }
      });

      // Format response rows
      let registerRows = allItems.map(item => {
        const g = grouped[item.id] || { invoiceIds: new Set(), qtySold: 0, taxableValue: 0, gstAmount: 0, gstRate: item.taxRate || 18 };
        const st = stockCalc[item.id] || { opening: 0, inward: 0, outward: 0 };
        const openingStock = st.opening;
        const closingStock = openingStock + st.inward - st.outward;
        const taxable = g.taxableValue;
        const gst = g.gstAmount;
        const totalValue = taxable + gst;
        const qtySold = g.qtySold;
        const avgPrice = qtySold > 0 ? taxable / qtySold : parseFloat(item.sellingPrice) || 0;

        return {
          itemId: item.id,
          itemName: item.name,
          sku: item.sku || 'N/A',
          hsnCode: item.hsnCode || 'N/A',
          unit: item.unit || 'Nos',
          warehouseName: item.Godown?.name || 'Main Warehouse',
          openingStock,
          invoiceCount: g.invoiceIds.size,
          qtySold,
          salesReturnsQty: 0,
          netQtySold: qtySold,
          closingStock,
          avgSellingPrice: Math.round(avgPrice * 100) / 100,
          taxableValue: Math.round(taxable * 100) / 100,
          gstRate: g.gstRate,
          gstAmount: Math.round(gst * 100) / 100,
          totalSalesValue: Math.round(totalValue * 100) / 100
        };
      });

      // Apply value filters if specified
      if (minRevenue) registerRows = registerRows.filter(r => r.totalSalesValue >= parseFloat(minRevenue));
      if (minGst) registerRows = registerRows.filter(r => r.gstAmount >= parseFloat(minGst));

      // Calculate totals row
      const totals = registerRows.reduce((acc, r) => {
        acc.totalInvoices += r.invoiceCount;
        acc.totalQty += r.netQtySold;
        acc.totalTaxable += r.taxableValue;
        acc.totalGst += r.gstAmount;
        acc.grandTotal += r.totalSalesValue;
        return acc;
      }, { totalInvoices: 0, totalQty: 0, totalTaxable: 0, totalGst: 0, grandTotal: 0 });

      res.json({
        period: { start, end },
        items: registerRows,
        totals: {
          totalInvoices: totals.totalInvoices,
          totalQty: Math.round(totals.totalQty * 100) / 100,
          totalTaxable: Math.round(totals.totalTaxable * 100) / 100,
          totalGst: Math.round(totals.totalGst * 100) / 100,
          grandTotal: Math.round(totals.grandTotal * 100) / 100
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/product-registers/purchase
   * Purchase Product Register grouped strictly by ItemId (UUID)
   */
  static async getPurchaseRegister(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const { start, end } = ProductRegistersController._getDateRange(req.query);
      const { search } = req.query;

      const itemsWhere = { CompanyId: companyId };
      if (search && search.trim()) {
        const term = `%${search.trim().toLowerCase()}%`;
        itemsWhere[Op.or] = [
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Item.name')), { [Op.like]: term }),
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Item.sku')), { [Op.like]: term }),
          Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('Item.hsnCode')), { [Op.like]: term })
        ];
      }

      const allItems = await Item.findAll({
        where: itemsWhere,
        include: [{ model: Godown, as: 'Godown', required: false }]
      });

      const itemIds = allItems.map(i => i.id);
      if (itemIds.length === 0) {
        return res.json({
          period: { start, end },
          items: [],
          totals: { totalSuppliers: 0, totalQty: 0, totalTaxable: 0, totalGst: 0, grandTotal: 0 }
        });
      }

      // Query Stock Movements for PURCHASES
      const isDateFiltered = req.query.month || (req.query.period !== 'ALL_TIME' && req.query.period !== 'ALL');
      const smWhere = {
        ItemId: { [Op.in]: itemIds },
        movementType: 'PURCHASE'
      };
      if (isDateFiltered) {
        smWhere.date = { [Op.between]: [start.toISOString().split('T')[0], end.toISOString().split('T')[0]] };
      }

      const purchaseMovements = await StockMovement.findAll({
        where: smWhere
      });

      const grouped = {};
      purchaseMovements.forEach(pm => {
        const id = pm.ItemId;
        if (!grouped[id]) {
          grouped[id] = {
            qtyPurchased: 0,
            taxableValue: 0,
            suppliers: new Set()
          };
        }
        const qty = Math.abs(parseFloat(pm.quantity) || 0);
        const rate = parseFloat(pm.rate) || 0;
        const amt = parseFloat(pm.amount) || (qty * rate);

        grouped[id].qtyPurchased += qty;
        grouped[id].taxableValue += amt;
        grouped[id].suppliers.add('Vendor Standard');
      });

      let registerRows = allItems.map(item => {
        const g = grouped[item.id] || { qtyPurchased: 0, taxableValue: 0, suppliers: new Set() };
        const qtyPurchased = g.qtyPurchased;
        const taxable = g.taxableValue;
        const gstRate = item.taxRate || 18;
        const gst = (taxable * gstRate) / 100;
        const totalValue = taxable + gst;
        const avgCost = qtyPurchased > 0 ? taxable / qtyPurchased : parseFloat(item.purchasePrice) || 0;

        return {
          itemId: item.id,
          itemName: item.name,
          sku: item.sku || 'N/A',
          hsnCode: item.hsnCode || 'N/A',
          unit: item.unit || 'Nos',
          warehouseName: item.Godown?.name || 'Main Warehouse',
          openingStock: 0,
          supplierCount: g.suppliers.size || (qtyPurchased > 0 ? 1 : 0),
          qtyPurchased,
          purchaseReturnsQty: 0,
          netQtyPurchased: qtyPurchased,
          closingStock: parseFloat(item.currentStock) || 0,
          avgPurchasePrice: Math.round(avgCost * 100) / 100,
          taxableValue: Math.round(taxable * 100) / 100,
          gstRate,
          gstAmount: Math.round(gst * 100) / 100,
          totalPurchaseValue: Math.round(totalValue * 100) / 100
        };
      });

      const totals = registerRows.reduce((acc, r) => {
        acc.totalSuppliers += r.supplierCount;
        acc.totalQty += r.netQtyPurchased;
        acc.totalTaxable += r.taxableValue;
        acc.totalGst += r.gstAmount;
        acc.grandTotal += r.totalPurchaseValue;
        return acc;
      }, { totalSuppliers: 0, totalQty: 0, totalTaxable: 0, totalGst: 0, grandTotal: 0 });

      res.json({
        period: { start, end },
        items: registerRows,
        totals: {
          totalSuppliers: totals.totalSuppliers,
          totalQty: Math.round(totals.totalQty * 100) / 100,
          totalTaxable: Math.round(totals.totalTaxable * 100) / 100,
          totalGst: Math.round(totals.totalGst * 100) / 100,
          grandTotal: Math.round(totals.grandTotal * 100) / 100
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/product-registers/ledger
   * Item Stock Movement Ledger (Date, Voucher #, In, Out, Balance Stock, Valuation ₹)
   */
  static async getProductLedger(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const { itemId } = req.query;
      const { start, end } = ProductRegistersController._getDateRange(req.query);

      if (!itemId) return res.status(400).json({ error: 'itemId is required' });

      const item = await Item.findOne({ where: { id: itemId, CompanyId: companyId } });
      if (!item) return res.status(404).json({ error: 'Product not found' });

      const movements = await StockMovement.findAll({
        where: { ItemId: itemId },
        order: [['date', 'ASC'], ['createdAt', 'ASC']]
      });

      let runningBalance = 0;
      let openingStock = 0;
      const unitCost = parseFloat(item.purchasePrice) || parseFloat(item.sellingPrice) || 0;

      const ledgerEntries = [];

      movements.forEach(m => {
        const mDate = new Date(m.date);
        const qty = parseFloat(m.quantity) || 0;

        if (mDate < start) {
          openingStock += qty;
          runningBalance += qty;
        } else if (mDate <= end) {
          runningBalance += qty;
          ledgerEntries.push({
            id: m.id,
            date: m.date,
            voucherType: m.movementType,
            voucherNumber: `MOV-${m.id.substring(0, 8).toUpperCase()}`,
            partyName: m.movementType === 'SALE' ? 'Customer Order' : 'Vendor Receipt',
            inwardQty: qty > 0 ? qty : 0,
            outwardQty: qty < 0 ? Math.abs(qty) : 0,
            balanceQty: runningBalance,
            valuationAmount: Math.round(runningBalance * unitCost * 100) / 100
          });
        }
      });

      res.json({
        item: {
          id: item.id,
          name: item.name,
          sku: item.sku,
          unit: item.unit || 'Nos',
          currentStock: item.currentStock
        },
        openingStock,
        closingStock: runningBalance,
        ledger: ledgerEntries
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/product-registers/drilldown
   * Drilldown transactions for a specific itemId
   */
  static async getDrilldown(req, res, next) {
    try {
      const companyId = req.user.companyId;
      const { itemId, type = 'sales' } = req.query;
      const { start, end } = ProductRegistersController._getDateRange(req.query);

      if (!itemId) return res.status(400).json({ error: 'itemId is required' });

      if (type === 'sales') {
        const invWhere = { CompanyId: companyId };
        if (req.query.period !== 'ALL_TIME' && req.query.period !== 'ALL') {
          invWhere.date = { [Op.between]: [start, end] };
        }

        const items = await SalesInvoiceItem.findAll({
          where: { itemId },
          include: [{
            model: SalesInvoice,
            where: invWhere
          }]
        });

        const transactions = items.map(si => {
          const inv = si.SalesInvoice;
          const qty = parseFloat(si.quantity) || 0;
          const rate = parseFloat(si.rate) || 0;
          const taxable = parseFloat(si.amount) || (qty * rate);
          const gstRate = parseFloat(si.gstRate) || 18;
          const gst = (taxable * gstRate) / 100;

          return {
            id: inv.id,
            date: inv.date,
            voucherNumber: inv.invoiceNumber,
            partyName: 'Customer',
            quantity: qty,
            price: rate,
            taxableValue: taxable,
            gstRate,
            gstAmount: Math.round(gst * 100) / 100,
            totalAmount: Math.round((taxable + gst) * 100) / 100
          };
        });

        return res.json({ type: 'sales', transactions });
      } else {
        const movements = await StockMovement.findAll({
          where: {
            ItemId: itemId,
            movementType: 'PURCHASE',
            date: { [Op.between]: [start.toISOString().split('T')[0], end.toISOString().split('T')[0]] }
          }
        });

        const transactions = movements.map(m => {
          const qty = Math.abs(parseFloat(m.quantity) || 0);
          const rate = parseFloat(m.rate) || 0;
          const taxable = parseFloat(m.amount) || (qty * rate);
          const gstRate = 18;
          const gst = (taxable * gstRate) / 100;

          return {
            id: m.id,
            date: m.date,
            voucherNumber: `BILL-${m.id.substring(0, 8).toUpperCase()}`,
            partyName: 'Vendor Supply',
            quantity: qty,
            price: rate,
            taxableValue: taxable,
            gstRate,
            gstAmount: Math.round(gst * 100) / 100,
            totalAmount: Math.round((taxable + gst) * 100) / 100
          };
        });

        return res.json({ type: 'purchase', transactions });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/reports/product-registers/performance
   * ABC Inventory Classification & Performance Analytics
   */
  static async getPerformance(req, res, next) {
    try {
      const companyId = req.user.companyId;

      const items = await Item.findAll({
        where: { CompanyId: companyId },
        order: [['currentStock', 'DESC']]
      });

      // ABC Analysis calculation (Class A: 80% revenue/value, Class B: 15%, Class C: 5%)
      const itemsWithValuation = items.map(i => ({
        id: i.id,
        name: i.name,
        sku: i.sku || 'N/A',
        stock: parseFloat(i.currentStock) || 0,
        price: parseFloat(i.sellingPrice) || 0,
        valuation: (parseFloat(i.currentStock) || 0) * (parseFloat(i.sellingPrice) || 0)
      }));

      const totalValuation = itemsWithValuation.reduce((sum, i) => sum + i.valuation, 0) || 1;

      itemsWithValuation.sort((a, b) => b.valuation - a.valuation);

      let accumulated = 0;
      const abcItems = itemsWithValuation.map(item => {
        accumulated += item.valuation;
        const percentage = (accumulated / totalValuation) * 100;
        let category = 'C';
        if (percentage <= 80) category = 'A';
        else if (percentage <= 95) category = 'B';

        return { ...item, abcCategory: category };
      });

      const classA = abcItems.filter(i => i.abcCategory === 'A');
      const classB = abcItems.filter(i => i.abcCategory === 'B');
      const classC = abcItems.filter(i => i.abcCategory === 'C');

      res.json({
        totalProducts: items.length,
        totalStockValuation: Math.round(totalValuation * 100) / 100,
        abcSummary: {
          classACount: classA.length,
          classBCount: classB.length,
          classCCount: classC.length
        },
        topSelling: abcItems.slice(0, 5),
        slowMoving: abcItems.filter(i => i.stock > 0).slice(-5)
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductRegistersController;
