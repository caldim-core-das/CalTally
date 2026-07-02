const { Op } = require('sequelize');
const {
  SavedReport,
  SalesInvoice,
  PurchaseOrder,
  Item,
  Ledger,
  Project,
} = require('../../models');

const MODULE_MODEL_MAP = {
  sales: SalesInvoice,
  purchases: PurchaseOrder,
  inventory: Item,
  ledgers: Ledger,
  projects: Project,
};

// Security: map frontend operators to safe Sequelize operators
const OPERATOR_MAP = {
  '=': Op.eq,
  '!=': Op.ne,
  '>': Op.gt,
  '>=': Op.gte,
  '<': Op.lt,
  '<=': Op.lte,
  'LIKE': Op.like,
  'IN': Op.in,
};

/**
 * Parse recursive filter tree into Sequelize where clause
 */
const parseFilterTree = (node, Model, depth = 0) => {
  if (depth > 8) throw new Error('Maximum filter nesting depth exceeded (Max: 8).');
  if (!node || typeof node !== 'object') return null;

  if (node.combinator) {
    if (node.combinator !== 'and' && node.combinator !== 'or') {
      throw new Error('Invalid combinator (must be and/or)');
    }
    if (!node.rules || !Array.isArray(node.rules) || node.rules.length === 0) {
      return null;
    }

    const seqOp = node.combinator === 'and' ? Op.and : Op.or;
    const parsedRules = node.rules.map(r => parseFilterTree(r, Model, depth + 1)).filter(Boolean);
    
    if (parsedRules.length === 0) return null;
    if (parsedRules.length === 1) return parsedRules[0]; // simplify single-rule groups
    return { [seqOp]: parsedRules };
  } else {
    // Leaf node
    const { field, operator, value } = node;
    const validAttributes = Object.keys(Model.rawAttributes);
    if (!validAttributes.includes(field)) {
      throw new Error(`Invalid column: ${field}`);
    }
    if (!OPERATOR_MAP[operator]) {
      throw new Error(`Invalid operator: ${operator}`);
    }

    const seqOp = OPERATOR_MAP[operator];
    return {
      [field]: { [seqOp]: operator === 'LIKE' ? `%${value}%` : value }
    };
  }
};

exports.executeCustomQuery = async (companyId, module, columns, filters) => {
  const Model = MODULE_MODEL_MAP[module];
  if (!Model) {
    throw new Error(`Module '${module}' is not supported for custom reports.`);
  }

  const validAttributes = Object.keys(Model.rawAttributes);
  const safeColumns = columns && Array.isArray(columns)
    ? columns.filter(col => validAttributes.includes(col))
    : undefined;

  // Backward compatibility: Convert flat array to tree
  let filterTree = filters;
  if (Array.isArray(filters)) {
    filterTree = { combinator: 'and', rules: filters };
  }

  let whereClause = {};
  if (filterTree) {
    whereClause = parseFilterTree(filterTree, Model) || {};
  }
  
  // Ensure company isolation
  whereClause.CompanyId = companyId;

  return await Model.findAll({
    attributes: safeColumns,
    where: whereClause,
    limit: 1000,
    order: [['createdAt', 'DESC']]
  });
};

exports.runCustomReport = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { module, columns, filters } = req.body;

    if (!companyId || companyId !== req.companyId) {
      return res.status(403).json({ error: 'Access denied to this company.' });
    }

    const data = await exports.executeCustomQuery(companyId, module, columns, filters);
    res.json(data);
  } catch (error) {
    console.error('Error running custom report:', error);
    res.status(500).json({ error: 'Failed to generate custom report.' });
  }
};

// --- CRUD for Saved Reports / Schedules ---

exports.createSavedReport = async (req, res) => {
  try {
    const { companyId } = req.params;
    const { name, module, reportConfig, isScheduled, cronExpression, emailRecipients } = req.body;

    if (companyId !== req.companyId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    // Check Role - Only Admins/Accountants/Managers can create (Checked via middleware usually, but good practice to assert)
    if (['VIEWER', 'EMPLOYEE'].includes(req.user.role)) {
       return res.status(403).json({ error: 'Viewers cannot create saved reports.' });
    }

    const savedReport = await SavedReport.create({
      companyId,
      name,
      module,
      reportConfig,
      isScheduled,
      cronExpression,
      emailRecipients,
      createdBy: req.user.id,
      isActive: true,
    });

    res.status(201).json(savedReport);
  } catch (error) {
    console.error('Error creating saved report:', error);
    res.status(500).json({ error: 'Failed to create saved report.' });
  }
};

exports.getSavedReports = async (req, res) => {
  try {
    const { companyId } = req.params;
    if (companyId !== req.companyId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const reports = await SavedReport.findAll({
      where: { companyId },
      order: [['createdAt', 'DESC']]
    });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching saved reports:', error);
    res.status(500).json({ error: 'Failed to fetch saved reports.' });
  }
};

exports.updateSavedReport = async (req, res) => {
  try {
    const { companyId, id } = req.params;
    if (companyId !== req.companyId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const report = await SavedReport.findOne({ where: { id, companyId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    await report.update(req.body);
    res.json(report);
  } catch (error) {
    console.error('Error updating saved report:', error);
    res.status(500).json({ error: 'Failed to update saved report.' });
  }
};

exports.deleteSavedReport = async (req, res) => {
  try {
    const { companyId, id } = req.params;
    if (companyId !== req.companyId) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const report = await SavedReport.findOne({ where: { id, companyId } });
    if (!report) return res.status(404).json({ error: 'Report not found' });

    await report.destroy();
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Error deleting saved report:', error);
    res.status(500).json({ error: 'Failed to delete saved report.' });
  }
};

exports.getValidColumns = async (req, res) => {
  try {
    const { module } = req.query;
    const Model = MODULE_MODEL_MAP[module];
    if (!Model) {
      return res.status(400).json({ error: `Module '${module}' is not supported.` });
    }
    const validAttributes = Object.keys(Model.rawAttributes);
    res.json(validAttributes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get columns' });
  }
};
