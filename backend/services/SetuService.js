const { SetuConsent, BankTransaction, Ledger } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Service to simulate Setu Account Aggregator Integration.
 * 
 * Production Note:
 * For production, swap the mock calls in this service with real Axios HTTP requests to Setu's endpoints
 * using the credentials loaded from process.env (SETU_CLIENT_ID, SETU_CLIENT_SECRET, etc.).
 * 
 * Example:
 * const response = await axios.post(`${process.env.SETU_BASE_URL}/consents`, payload, {
 *   headers: {
 *     'x-client-id': process.env.SETU_CLIENT_ID,
 *     'x-client-secret': process.env.SETU_CLIENT_SECRET,
 *     'x-product-instance-id': process.env.SETU_PRODUCT_INSTANCE_ID
 *   }
 * });
 */
class SetuService {
  /**
   * Initiates a mock consent request with Setu.
   */
  async createConsentRequest(companyId, ledgerId, bankName) {
    const ledger = await Ledger.findByPk(ledgerId);
    if (!ledger) {
      throw new Error('Bank account ledger not found');
    }

    const consentId = `setu_con_${uuidv4().substring(0, 8)}`;
    // In production: Setu returns a redirect URL to their AA consent approval portal
    const redirectUrl = `/banking/view/${ledgerId}?setu_consent_flow=true&consent_id=${consentId}`;

    // Create the consent in PENDING state
    const consent = await SetuConsent.create({
      consentId,
      CompanyId: companyId,
      LedgerId: ledgerId,
      status: 'PENDING',
      bankName: bankName || ledger.bankName || 'HDFC Bank',
      accountNumber: ledger.accountNumber || 'XXXXXX1234'
    });

    return {
      consentId: consent.consentId,
      redirectUrl
    };
  }

  /**
   * Retrieves the consent status.
   */
  async getConsentStatus(consentId) {
    const consent = await SetuConsent.findOne({ where: { consentId } });
    if (!consent) {
      throw new Error('Consent request not found');
    }
    return consent;
  }

  /**
   * Simulates the user approving consent on Setu's portal.
   */
  async approveConsent(consentId) {
    const consent = await SetuConsent.findOne({ where: { consentId } });
    if (!consent) {
      throw new Error('Consent request not found');
    }

    await consent.update({
      status: 'ACTIVE',
      linkedAt: new Date()
    });

    return consent;
  }

  /**
   * Simulates fetching bank statement via Setu and syncing transactions.
   */
  async syncTransactions(consentId, companyId, ledgerId) {
    const consent = await SetuConsent.findOne({ 
      where: { consentId, CompanyId: companyId, LedgerId: ledgerId } 
    });

    if (!consent) {
      throw new Error('Active Setu connection not found for this bank account');
    }

    if (consent.status !== 'ACTIVE') {
      throw new Error('Consent status must be ACTIVE to pull bank feed data');
    }

    // Generate mock bank feed data (Credit = Inward, Debit = Outward)
    const mockFeed = [
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        description: 'UPI/9920199/Merchant Payment to CalTally Customer',
        amount: 15400.00,
        type: 'Credit'
      },
      {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        description: 'NEFT/DR/VEND-OFFICE-RENT-REPLICA',
        amount: 25000.00,
        type: 'Debit'
      },
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        description: 'UPI/2290123/TEA COFFE BREAK SNACKS',
        amount: 450.00,
        type: 'Debit'
      },
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        description: 'IMPS/CR/CLIENT-INVOICE-RECEIPT',
        amount: 88500.00,
        type: 'Credit'
      },
      {
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        description: 'BANK SERVICE CHARGES + GST',
        amount: 118.00,
        type: 'Debit'
      },
      {
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        description: 'SALARY PAYOUT FOR JUNE 2026',
        amount: 48200.00,
        type: 'Debit'
      }
    ];

    // Bulk create them in BankTransaction model
    const transactions = await Promise.all(
      mockFeed.map(async (entry) => {
        // Avoid duplicate entries by checking if the transaction description and date match
        const [tx, created] = await BankTransaction.findOrCreate({
          where: {
            CompanyId: companyId,
            description: entry.description,
            amount: entry.amount,
            type: entry.type
          },
          defaults: {
            date: entry.date,
            isMatched: false
          }
        });
        return tx;
      })
    );

    // Update synchronization log on the consent record
    await consent.update({
      lastSyncedAt: new Date()
    });

    return {
      message: 'Bank feed synced successfully',
      syncedCount: mockFeed.length,
      lastSyncedAt: consent.lastSyncedAt
    };
  }
}

module.exports = new SetuService();
