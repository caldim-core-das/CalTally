const reports = {
  sales: {
    name: 'Sales Analysis',
    category: 'tax',
    route: '/reports/sales',
    permissions: ['report:view', 'report:export', 'report:print'],
    dependencies: ['Sales', 'Ledgers'],
    enabled: true
  },
  purchases: {
    name: 'Purchase Analysis',
    category: 'tax',
    route: '/reports/purchases',
    permissions: ['report:view', 'report:export', 'report:print'],
    dependencies: ['Purchases', 'Ledgers'],
    enabled: true
  },
  gst: {
    name: 'GST Analysis',
    category: 'tax',
    route: '/reports/gst',
    permissions: ['report:view', 'report:export', 'report:print'],
    dependencies: ['Sales', 'Purchases', 'Ledgers'],
    enabled: true
  },
  tds: {
    name: 'TDS Analysis',
    category: 'tax',
    route: '/reports/tds',
    permissions: ['report:view', 'report:export', 'report:print'],
    dependencies: ['Purchases', 'Ledgers'],
    enabled: true
  },
  tcs: {
    name: 'TCS Analysis',
    category: 'tax',
    route: '/reports/tcs',
    permissions: ['report:view', 'report:export', 'report:print'],
    dependencies: ['Sales', 'Ledgers'],
    enabled: true
  }
};

class ReportRegistry {
  static getReport(key) {
    return reports[key] || null;
  }

  static getAllReports() {
    return Object.keys(reports).map(key => ({ key, ...reports[key] }));
  }

  static getEnabledReports() {
    return Object.keys(reports)
      .filter(key => reports[key].enabled)
      .map(key => ({ key, ...reports[key] }));
  }
}

module.exports = ReportRegistry;
