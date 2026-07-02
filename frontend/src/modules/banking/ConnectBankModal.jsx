import { useState } from 'react';
import { bankFeedAPI } from '../../services/api';

export default function ConnectBankModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConnect = async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await bankFeedAPI.createConsent();
      // Redirect user to Setu consent screen
      // After approval, Setu redirects back and posts webhook
      window.location.href = data.consentUrl;
    } catch (err) {
      setError('Could not initiate bank connection. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-slate-100 animate-scale-up" style={{ maxWidth: 480 }}>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Connect Your Bank Account</h2>
        <p style={{ color: '#555', marginBottom: 16 }} className="text-xs leading-relaxed">
          CalTally uses the RBI-regulated Account Aggregator framework to securely
          fetch your bank transactions. Your credentials are never shared with us.
        </p>
        <ul style={{ color: '#444', fontSize: 13, marginBottom: 20 }} className="list-disc pl-5 space-y-1.5 font-medium">
          <li>Supports 112+ banks including HDFC, ICICI, SBI, Axis, Kotak</li>
          <li>Transactions import automatically every day</li>
          <li>You can revoke access at any time</li>
          <li>End-to-end encrypted — CalTally never sees your login</li>
        </ul>
        {error && <p style={{ color: 'red', fontSize: 13, marginBottom: 10 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleConnect} 
            disabled={loading}
            className="px-5 py-2.5 bg-[#1A568E] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#154673] transition-all shadow-lg shadow-blue-900/20"
          >
            {loading ? 'Redirecting...' : 'Connect Bank →'}
          </button>
        </div>
      </div>
    </div>
  );
}
