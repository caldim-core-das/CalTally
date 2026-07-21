const { CustomRole } = require('../../models');

// POST /api/roles
exports.createRole = async (req, res, next) => {
  try {
    const { name, description, baseRole } = req.body;
    const companyId = req.user.companyId;

    if (!name || !baseRole) {
      return res.status(400).json({ error: 'Name and base role are required' });
    }

    const VALID_BASE_ROLES = ['ADMIN', 'ACCOUNTANT', 'MANAGER', 'AUDITOR', 'VIEWER', 'EMPLOYEE'];
    if (!VALID_BASE_ROLES.includes(baseRole)) {
      return res.status(400).json({ error: `Invalid base role. Must be one of: ${VALID_BASE_ROLES.join(', ')}` });
    }

    // Ceiling Rule: Cannot exceed the privilege of the creator (non-SUPER_ADMINs cannot select SUPER_ADMIN)
    if (req.user.role !== 'SUPER_ADMIN' && baseRole === 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Permission Denied: Custom role base cannot exceed your own privilege ceiling (SUPER_ADMIN is restricted).' });
    }

    // Duplicate protection
    const existing = await CustomRole.findOne({
      where: { CompanyId: companyId, name: name.trim() }
    });

    if (existing) {
      return res.status(400).json({ error: 'Role name already exists. Choose another name.' });
    }

    const newRole = await CustomRole.create({
      CompanyId: companyId,
      name,
      description,
      baseRole,
      isActive: true,
      createdBy: req.user.id
    });

    res.status(201).json(newRole);
  } catch (err) {
    next(err);
  }
};

// GET /api/roles
exports.getRoles = async (req, res, next) => {
  try {
    const roles = await CustomRole.findAll({
      where: { CompanyId: req.user.companyId },
      order: [['createdAt', 'DESC']]
    });
    res.json(roles);
  } catch (err) {
    next(err);
  }
};

// PUT /api/roles/:id
exports.updateRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, baseRole, isActive } = req.body;
    const companyId = req.user.companyId;

    const role = await CustomRole.findOne({
      where: { id, CompanyId: companyId }
    });

    if (!role) {
      return res.status(404).json({ error: 'Role not found.' });
    }

    if (baseRole) {
      const VALID_BASE_ROLES = ['ADMIN', 'ACCOUNTANT', 'MANAGER', 'AUDITOR', 'VIEWER', 'EMPLOYEE'];
      if (!VALID_BASE_ROLES.includes(baseRole)) {
        return res.status(400).json({ error: `Invalid base role. Must be one of: ${VALID_BASE_ROLES.join(', ')}` });
      }

      // Ceiling Rule: Cannot exceed the privilege of the creator (non-SUPER_ADMINs cannot select SUPER_ADMIN)
      if (req.user.role !== 'SUPER_ADMIN' && baseRole === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Permission Denied: Custom role base cannot exceed your own privilege ceiling (SUPER_ADMIN is restricted).' });
      }
    }

    // Duplicate check if name changed
    if (name && name !== role.name) {
      const existing = await CustomRole.findOne({
        where: { CompanyId: companyId, name: name }
      });
      if (existing) {
        return res.status(400).json({ error: 'Role name already exists. Choose another name.' });
      }
    }

    // Update fields
    if (name) role.name = name;
    if (description !== undefined) role.description = description;
    if (baseRole) role.baseRole = baseRole;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    res.json(role);
  } catch (err) {
    next(err);
  }
};
