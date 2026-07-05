import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { MailCheck, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';

export function VerifyEmailScreen() {
  const { resendVerification } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendVerification();
      setMessage('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setMessage(err.message || 'Error sending email.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    // Force refresh user token to update emailVerified status
    auth.currentUser?.reload();
    window.location.reload();
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-[#05070a] font-sans text-slate-900 dark:text-slate-100 transition-colors overflow-hidden relative items-center justify-center p-4">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="w-full max-w-md p-8 rounded-[40px] bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-2xl backdrop-blur-xl relative z-10 transition-colors flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center mb-6">
          <MailCheck className="w-10 h-10 text-indigo-400" />
        </div>
        
        <h2 className="text-2xl font-bold tracking-tight mb-2">Verify Your Email</h2>
        <p className="text-slate-400 text-sm mb-8">
          We've sent a verification email to your address. Please verify your email to access the Crane IoT platform.
        </p>

        {message && (
          <div className="mb-6 p-4 w-full bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-300 text-sm">
            {message}
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button 
            onClick={handleRefresh}
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20"
          >
            I've Verified My Email
          </button>
          
          <button 
            onClick={handleResend}
            disabled={loading}
            className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-semibold transition-all border border-white/10 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>

          <button 
            onClick={() => auth.signOut()}
            className="w-full py-3 mt-4 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
