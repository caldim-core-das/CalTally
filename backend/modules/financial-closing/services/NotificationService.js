const { AppNotification } = require('../../../models');

class NotificationService {
  /**
   * Dispatches a system compliance alert to the AppNotification table for company admins.
   */
  static async triggerNotification({ companyId, message, type = 'INFO', actionLink = null }) {
    if (!companyId) {
      throw new Error('Company ID is required to dispatch notifications.');
    }

    return await AppNotification.create({
      CompanyId: companyId,
      message,
      type,
      isRead: false,
      actionLink
    });
  }
}

module.exports = NotificationService;
