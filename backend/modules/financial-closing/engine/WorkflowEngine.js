const allowedTransitions = {
  'DRAFT': ['REVIEWED'],
  'REVIEWED': ['DRAFT', 'APPROVED'],
  'APPROVED': ['DRAFT', 'LOCKED'],
  'LOCKED': ['REOPENED', 'FILED'],
  'REOPENED': ['DRAFT'],
  'FILED': ['REVISED', 'ACKNOWLEDGED'],
  'REVISED': ['FILED'],
  'ACKNOWLEDGED': []
};

const roleRestrictions = {
  'LOCKED': ['ADMIN', 'FINANCE_MANAGER'],
  'REOPENED': ['SUPER_ADMIN'],
  'FILED': ['ADMIN', 'FINANCE_MANAGER', 'ACCOUNTANT'],
  'ACKNOWLEDGED': ['ADMIN', 'FINANCE_MANAGER']
};

class WorkflowEngine {
  /**
   * Validates if a state transition is legal and authorized for the user's role.
   */
  static validateTransition(currentStatus, targetStatus, userRole) {
    const cur = (currentStatus || 'DRAFT').toUpperCase();
    const tar = (targetStatus || 'DRAFT').toUpperCase();
    const role = (userRole || 'ACCOUNTANT').toUpperCase();

    // 1. Check state route transition path
    const targets = allowedTransitions[cur] || [];
    if (!targets.includes(tar)) {
      throw new Error(`Invalid state transition: Cannot transition closing from ${cur} to ${tar}.`);
    }

    // 2. Enforce role restriction gates
    const requiredRoles = roleRestrictions[tar];
    if (requiredRoles && !requiredRoles.includes(role)) {
      throw new Error(`Security Error: Role ${role} is not authorized to transition state to ${tar}.`);
    }

    return true;
  }

  static getAllowedTransitions(currentStatus) {
    const cur = (currentStatus || 'DRAFT').toUpperCase();
    return allowedTransitions[cur] || [];
  }
}

module.exports = WorkflowEngine;
