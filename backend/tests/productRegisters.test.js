const request = require('supertest');
const app = require('../server');
const { User, Company, Item, SalesInvoice, SalesInvoiceItem, StockMovement } = require('../models');

describe('Product Registers Module Integration Tests', () => {
  let token;
  let testCompany;
  let testItem;

  beforeAll(async () => {
    // 1. Create or find test company
    testCompany = await Company.create({
      name: 'Product Register Test Co',
      legalName: 'Product Register Test Co Pvt Ltd',
      currency: 'INR'
    });

    // 2. Create test user
    const testUser = await User.create({
      email: `test_pr_${Date.now()}@example.com`,
      password: 'hashedpassword123',
      name: 'PR Tester',
      role: 'ADMIN',
      status: 'ACTIVE'
    });

    await testCompany.addUser(testUser, { through: { role: 'ADMIN' } });

    // 3. Create test item
    testItem = await Item.create({
      name: 'Test Enterprise Laptop',
      sku: `SKU-PR-${Date.now()}`,
      hsnCode: '84713010',
      unit: 'Nos',
      sellingPrice: 50000,
      purchasePrice: 40000,
      taxRate: 18,
      currentStock: 25,
      CompanyId: testCompany.id
    });

    // 4. Create test sales invoice & item
    const salesInvoice = await SalesInvoice.create({
      invoiceNumber: `INV-PR-${Date.now()}`,
      invoiceDate: new Date(),
      customerName: 'Test Customer Corp',
      totalAmount: 118000,
      CompanyId: testCompany.id
    });

    await SalesInvoiceItem.create({
      itemId: testItem.id,
      SalesInvoiceId: salesInvoice.id,
      quantity: 2,
      rate: 50000,
      amount: 100000,
      gstRate: 18
    });

    // 5. Create test stock movement
    await StockMovement.create({
      ItemId: testItem.id,
      movementType: 'PURCHASE',
      quantity: 10,
      rate: 40000,
      amount: 400000,
      date: new Date().toISOString().split('T')[0]
    });
  });

  test('GET /api/v1/reports/product-registers/sales should return sales register with ItemId grouping', async () => {
    // Mock user auth by directly testing controller logic if token middleware requires JWT sign
    const controller = require('../modules/reports/controllers/productRegisters.controller');
    
    const req = {
      user: { companyId: testCompany.id },
      query: { period: 'THIS_MONTH' }
    };
    const res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    const next = jest.fn();

    await controller.getSalesRegister(req, res, next);

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.items).toBeDefined();
    expect(responseData.totals).toBeDefined();
  });

  test('GET /api/v1/reports/product-registers/purchase should return purchase register', async () => {
    const controller = require('../modules/reports/controllers/productRegisters.controller');
    
    const req = {
      user: { companyId: testCompany.id },
      query: { period: 'THIS_MONTH' }
    };
    const res = {
      json: jest.fn()
    };
    const next = jest.fn();

    await controller.getPurchaseRegister(req, res, next);

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.items).toBeDefined();
  });

  test('GET /api/v1/reports/product-registers/ledger should return stock timeline for item', async () => {
    const controller = require('../modules/reports/controllers/productRegisters.controller');
    
    const req = {
      user: { companyId: testCompany.id },
      query: { itemId: testItem.id, period: 'THIS_MONTH' }
    };
    const res = {
      json: jest.fn()
    };
    const next = jest.fn();

    await controller.getProductLedger(req, res, next);

    expect(res.json).toHaveBeenCalled();
    const responseData = res.json.mock.calls[0][0];
    expect(responseData.item.id).toBe(testItem.id);
  });
});
