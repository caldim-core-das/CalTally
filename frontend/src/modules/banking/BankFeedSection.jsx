import { useEffect, useState } from 'react';
import api, { bankFeedAPI } from '../../services/api';
import ConnectBankModal from './ConnectBankModal';

export default function BankFeedSection() {
  const [consents, setConsents] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    try {
      const { data } = await bankFeedAPI.getConnectedAccounts();
      setConsents(data);
    } catch (err) {
      console.error('Failed to load bank feed accounts:', err);
    }
  };

  const handleMockRedirect = async (consentId) => {
    try {
      // 1. Trigger simulated active consent webhook
      await api.post('/bank-feed/webhook', {
        type: 'CONSENT_STATUS_UPDATE',
        consentId: consentId,
        data: {
          status: 'ACTIVE',
          detail: {
            accounts: [
              { maskedAccNumber: 'XXXX8899', fipId: 'HDFC-FIP', fiType: 'DEPOSIT', linkRefNumber: 'ref-hdfc-123', accType: 'SAVINGS' }
            ]
          }
        }
      });

      // 2. Trigger simulated data session ready webhook
      await api.post('/bank-feed/webhook', {
        type: 'SESSION_STATUS_UPDATE',
        consentId: consentId,
        dataSessionId: 'mock-session-123',
        data: { status: 'COMPLETED' }
      });

      // Clean query parameters from URL without reloading page
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      
      load();
    } catch (err) {
      console.error('Failed to trigger mock webhook flow:', err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mock_consent_success') === 'true') {
      const consentId = params.get('consent_id');
      if (consentId) {
        handleMockRedirect(consentId);
      }
    } else {
      load();
    }
  }, []);

  const revoke = async (consentId) => {
    if (!window.confirm('Disconnect this bank feed?')) return;
    try {
      await bankFeedAPI.revokeConsent(consentId);
      load();
    } catch (err) {
      console.error('Failed to revoke consent:', err);
    }
  };

  const statusColor = { ACTIVE: '#1F7A4D', PENDING: '#B45F06', REVOKED: '#888', EXPIRED: '#CC0000' };
  const activeConsents = consents.filter(c => ['ACTIVE', 'PENDING'].includes(c.status));

  return (
    <div style={{ marginTop: 24 }} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 className="text-[15px] font-bold text-slate-800 tracking-tight">Connected Bank Feeds (RBI Account Aggregator)</h3>
        <button 
          onClick={() => setShowModal(true)}
          style={{ background: '#1A568E', color: '#fff', padding: '8px 16px', borderRadius: 12 }}
          className="text-xs font-bold uppercase tracking-wider hover:bg-[#154673] transition-all shadow-md flex items-center gap-1.5"
        >
          + Connect Bank
        </button>
      </div>

      {activeConsents.length === 0 && (
        <p style={{ color: '#888', marginTop: 16 }} className="text-xs font-medium italic">
          No bank feeds connected. Click "Connect Bank" to auto-import transactions.
        </p>
      )}

      <div className="space-y-4 mt-4">
        {activeConsents.map(consent => (
          <div key={consent.id} style={{ border: '1px solid #f1f5f9', borderRadius: 16, padding: 16 }} className="bg-slate-50/30">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }} className="text-xs text-slate-700">
                Status: <span style={{ color: statusColor[consent.status] || '#333' }} className="font-extrabold">
                  {consent.status}
                </span>
              </span>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                {consent.lastFetchedAt && (
                  <span style={{ fontSize: 11, color: '#94a3b8' }} className="font-medium">
                    Last synced: {new Date(consent.lastFetchedAt).toLocaleString('en-IN')}
                  </span>
                )}
                {consent.status === 'ACTIVE' && (
                  <button 
                    onClick={() => revoke(consent.id)}
                    style={{ color: '#CC0000', background: 'none', border: 'none', cursor: 'pointer' }}
                    className="text-xs font-bold hover:underline"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {(consent.BankFeedAccounts || []).map(acc => (
                <div key={acc.id} style={{ paddingLeft: 12, borderLeft: '3px solid #1A568E' }} className="text-xs text-slate-600 font-medium">
                  <span className="font-bold text-slate-800">{acc.bankName || acc.fipId}</span>
                  {' — '}{acc.maskedAccNumber}
                  {' ('}{acc.accountType || 'SAVINGS'}{')'}
                  {acc.ifscCode && <span style={{ color: '#94a3b8', marginLeft: 8 }} className="font-mono">IFSC: {acc.ifscCode}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <ConnectBankModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
