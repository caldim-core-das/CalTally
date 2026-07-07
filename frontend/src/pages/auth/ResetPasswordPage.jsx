import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Lock, Check, Loader2 } from 'lucide-react';
import { authAPI } from '../../services/api';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');

  const isDark = document.documentElement.classList.contains('dark') ||
    localStorage.getItem('theme') === 'dark';

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing reset token. Please request a new password reset.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const res = await authAPI.resetPassword(token, password);
      setStatus('success');
      setMessage(res.data.message);
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      setStatus('error');
      if (err.response?.data?.issues) {
        setMessage(`Password too weak: ${err.response.data.issues.join(', ')}`);
      } else {
        setMessage(err.response?.data?.error || 'Failed to reset password.');
      }
    }
  };

  if (!token) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-6 font-sans ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className={`w-full max-w-md rounded-2xl shadow-xl p-8 text-center space-y-4 border ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        }`}>
          <h1 className="text-xl font-bold text-red-500">Invalid Link</h1>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{message}</p>
          <button onClick={() => navigate('/forgot-password')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-bold">
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] mix-blend-multiply animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] mix-blend-multiply animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10 transform transition-transform hover:scale-105 duration-300 cursor-default">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-500/30">
            <ShieldCheck size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <span className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            CalBooks ERP
          </span>
        </div>

        {/* Card */}
        <div className={`w-full rounded-[24px] shadow-2xl p-10 space-y-8 border backdrop-blur-xl transition-all duration-500 ${
          isDark 
            ? 'bg-slate-800/80 border-slate-700/50 shadow-black/50' 
            : 'bg-white/90 border-white shadow-slate-200/80'
        }`}>
          <div className="text-center space-y-3">
            <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Set New Password
            </h1>
            <p className={`text-[15px] font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter your new strong password below.
            </p>
          </div>

          {status === 'success' ? (
            <div className={`p-8 rounded-2xl text-sm ${isDark ? 'bg-slate-800/50 text-slate-300 border-slate-700' : 'bg-emerald-50/80 text-emerald-900 border-emerald-200/50'} border flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500`}>
               <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                 <Check size={32} className="text-emerald-600 stroke-[3]"/>
               </div>
               <h3 className="text-lg font-bold text-emerald-800">Password Reset!</h3>
               <p className="font-medium text-[14px] leading-relaxed opacity-90">{message}</p>
               <p className="text-xs mt-4 opacity-70 italic flex items-center gap-2">
                 <Loader2 size={12} className="animate-spin" /> Redirecting to login...
               </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {status === 'error' && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-600 text-center animate-in slide-in-from-top-2">
                  {message}
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-[15px] outline-none transition-all font-medium border-2 shadow-sm ${
                        isDark 
                          ? 'bg-slate-900/50 border-slate-700 text-white focus:border-blue-500 focus:bg-slate-900' 
                          : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:shadow-blue-500/10'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-[15px] outline-none transition-all font-medium border-2 shadow-sm ${
                        isDark 
                          ? 'bg-slate-900/50 border-slate-700 text-white focus:border-blue-500 focus:bg-slate-900' 
                          : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:shadow-blue-500/10'
                      }`}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Password strength guide */}
              <div className={`p-4 rounded-xl text-[12px] space-y-2.5 transition-all ${isDark ? 'bg-slate-900/50 border border-slate-700/50' : 'bg-slate-50 border border-slate-200'}`}>
                <p className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Password must contain:</p>
                <div className="grid grid-cols-1 gap-y-2">
                  <div className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    {password.length >= 8 ? <Check size={14} className="stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />} At least 8 characters
                  </div>
                  <div className={`flex items-center gap-2 ${/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                    {/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? <Check size={14} className="stroke-[3]" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-1 mr-1" />} Upper, lower, number, special char
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={status === 'loading'}
                className="group w-full flex items-center justify-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {status === 'loading' ? <Loader2 size={20} className="animate-spin" /> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
