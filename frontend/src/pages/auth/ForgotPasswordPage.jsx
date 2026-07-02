import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { authAPI } from '../../services/api';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const isDark = document.documentElement.classList.contains('dark') ||
    localStorage.getItem('theme') === 'dark';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      const res = await authAPI.forgotPassword(email);
      setStatus('success');
      setMessage(res.data.message);
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.error || 'Failed to request password reset. Please try again.');
    }
  };

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
            CalTally ERP
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
              Forgot Password?
            </h1>
            <p className={`text-[15px] font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              No worries, we'll send you reset instructions.
            </p>
          </div>

          {status === 'success' ? (
            <div className={`p-8 rounded-2xl text-sm ${isDark ? 'bg-slate-800/50 text-slate-300 border-slate-700' : 'bg-emerald-50/80 text-emerald-900 border-emerald-200/50'} border flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in duration-500`}>
               <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                 <Mail size={32} className="text-emerald-600"/>
               </div>
               <h3 className="text-lg font-bold text-emerald-800">Check your email</h3>
               <p className="font-medium text-[14px] leading-relaxed opacity-90">{message}</p>
               <p className="text-xs mt-4 opacity-70 italic">Didn't receive the email? Check your spam filter.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {status === 'error' && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm font-semibold text-red-600 text-center animate-in slide-in-from-top-2">
                  {message}
                </div>
              )}
              
              <div className="space-y-2">
                <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ml-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Email address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl text-[15px] outline-none transition-all font-medium border-2 shadow-sm ${
                      isDark 
                        ? 'bg-slate-900/50 border-slate-700 text-white focus:border-blue-500 focus:bg-slate-900' 
                        : 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white focus:shadow-blue-500/10'
                    }`}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={status === 'loading'}
                className="group w-full flex items-center justify-center py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-[15px] shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100"
              >
                {status === 'loading' ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Send Reset Link
                    <ArrowLeft size={16} className="rotate-180 transition-transform group-hover:translate-x-1" />
                  </span>
                )}
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link to="/login" className="inline-flex items-center gap-2 text-[14px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors group">
              <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
