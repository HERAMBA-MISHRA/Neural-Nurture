"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
const nnStore = { setItem: (k, v) => localStorage.setItem(`nn_${k}`, v), getItem: (k) => localStorage.getItem(`nn_${k}`), clear: () => ['name','email','role'].forEach(k => localStorage.removeItem(`nn_${k}`)) };
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../lib/store';


export default function AuthPage() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isOtpMode, setIsOtpMode] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [role, setRole] = useState('patient'); 
  const router = useRouter();
  const setUser = useStore(state => state.setUser);


  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`
        }
      });
      if (error) {
        toast.error(error.message);
        setErrorMsg(error.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: otpEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: true
        }
      });
      if (error) {
        setErrorMsg(error.message);
        toast.error(error.message);
      } else {
        setOtpSent(true);
        toast.success('Check your email for the OTP code!');
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let { data, error } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otpCode,
        type: 'email'
      });

      if (error) {
         // Some Supabase versions use 'magiclink' type for OTP sign-ins
         const retry = await supabase.auth.verifyOtp({
           email: otpEmail,
           token: otpCode,
           type: 'magiclink'
         });
         data = retry.data;
         error = retry.error;
      }

      if (error) {
        toast.error(error.message);
        setErrorMsg(error.message);
        setLoading(false);
      } else {
        toast.success('Successfully authenticated!');
        const userRole = data.user?.user_metadata?.role || 'patient';
        const name = data.user?.user_metadata?.first_name || otpEmail.split('@')[0];
        
        nnStore.setItem('name', name);
        nnStore.setItem('email', otpEmail);
        nnStore.setItem('role', userRole);
        if (data.session) // session handled by Supabase;
        
        // Update Zustand Store
        setUser({ name, email: otpEmail, role: userRole });
        
        window.location.href = userRole === 'doctor' ? '/doctor/dashboard' : '/dashboard';
      }

    } catch (err) {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    try {
      if (isLoginMode) {
        const adminUser = process.env.NEXT_PUBLIC_ADMIN_USERNAME;
        const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
        const isAdminEnabled = process.env.NEXT_PUBLIC_IS_ADMIN_ENABLED === 'true';

        if (isAdminEnabled && adminUser && adminPass && email.trim() === adminUser.trim() && password === adminPass) {
          toast.success('Admin access granted.');
          nnStore.setItem('name', 'Administrator');
          nnStore.setItem('role', 'admin');
          sessionStorage.setItem('admin_auth', 'true');
          window.location.replace('/admin/dashboard');
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          setErrorMsg(error.message);
          setLoading(false);
        } else {
          toast.success('Login Successful!');
          const userRole = data.user?.user_metadata?.role || 'patient';
          const name = data.user?.user_metadata?.first_name || email.split('@')[0];
          nnStore.setItem('name', name);
          nnStore.setItem('email', data.user.email);
          nnStore.setItem('role', userRole);
          // session handled by Supabase;
          
          // Update Zustand Store
          setUser({ name, email: data.user.email, role: userRole });

          window.location.href = userRole === 'doctor' ? '/doctor/dashboard' : '/dashboard';
        }

      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { first_name: firstName, last_name: lastName, role: role },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });
        if (error) {
          toast.error(error.message);
          setErrorMsg(error.message);
          setLoading(false);
        } else {
          toast.success('Account Created! Please verify your email.');
          nnStore.setItem('name', firstName);
          nnStore.setItem('email', data.user?.email);
          nnStore.setItem('role', role);
          if (data.session) {
              // session handled by Supabase;
          }
          setTimeout(() => {
            window.location.href = role === 'doctor' ? '/doctor/dashboard' : '/dashboard';
          }, 2000);
        }
      }
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-6 relative overflow-hidden font-['Manrope']">
      
      {/* High-Contrast Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0], rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ x: [0, -100, 0], y: [0, 50, 0], rotate: [360, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-indigo-900/20 rounded-full blur-[120px]" 
        />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
      </div>

      <Link href="/" className="absolute top-8 left-8 z-50 group">
        <motion.div 
          whileHover={{ scale: 1.1, x: -5 }}
          whileTap={{ scale: 0.9 }}
          className="w-12 h-12 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-blue-400 shadow-2xl transition-all"
        >
          <span className="material-symbols-outlined font-bold">arrow_back</span>
        </motion.div>
      </Link>

      <motion.main 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-[480px] relative z-10"
      >
        {/* Modern Branding */}
        <div className="flex flex-col items-center mb-8">
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-4"
          >
            <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>medical_services</span>
          </motion.div>
          <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 mb-1">Neural <span className="text-blue-600">Nurture</span></h1>
          <p className="text-slate-400 font-bold tracking-[0.4em] text-[8px] uppercase">Precision Healthcare Platform</p>
        </div>

        {/* High-Contrast Light Glass Card */}
        <div className="bg-white/70 backdrop-blur-3xl p-10 rounded-[32px] border border-slate-200 shadow-2xl relative overflow-hidden">
          
          <div className="flex p-1 bg-slate-100 rounded-xl mb-8 border border-slate-200">
            <button 
              onClick={() => { setIsLoginMode(true); setIsOtpMode(false); }}
              className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${isLoginMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => { setIsLoginMode(false); setIsOtpMode(false); }}
              className={`flex-1 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${!isLoginMode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Register
            </button>

          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={isOtpMode ? 'otp' : isLoginMode ? 'login' : 'register'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <header className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {isOtpMode ? 'One-Time Access' : isLoginMode ? 'Welcome Back' : 'Get Started'}
                </h2>
                <p className="text-slate-500 text-xs font-medium leading-relaxed">
                  {isOtpMode ? 'Verify your identity with the code sent to your email.' : isLoginMode ? 'Sign in to access your clinical diagnostics.' : 'Create your account to start your journey.'}
                </p>
              </header>

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[11px] font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  {errorMsg}
                </div>
              )}


              {!isOtpMode ? (
                <form onSubmit={handleAuth} className="space-y-5">
                  {!isLoginMode && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                        <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600/50 rounded-xl py-3.5 px-5 text-slate-900 font-medium transition-all outline-none" placeholder="Julian" type="text" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                        <input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600/50 rounded-xl py-3.5 px-5 text-slate-900 font-medium transition-all outline-none" placeholder="Moore" type="text" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Clinical Email</label>
                    <input required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600/50 rounded-xl py-3.5 px-5 text-slate-900 font-medium transition-all outline-none" placeholder="name@neuralnurture.com" type="email" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Access Password</label>
                    <input required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-600/50 rounded-xl py-3.5 px-5 text-slate-900 font-medium transition-all outline-none" placeholder="••••••••" type="password" />
                  </div>

                  {!isLoginMode && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Portal Access Level</label>
                      <div className="flex gap-3">
                        <button 
                          type="button"
                          onClick={() => setRole('patient')}
                          className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border ${role === 'patient' ? 'bg-blue-50 border-blue-600 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                        >
                          Patient
                        </button>
                        <button 
                          type="button"
                          onClick={() => setRole('doctor')}
                          className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all border ${role === 'doctor' ? 'bg-blue-50 border-blue-600 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                        >
                          Doctor
                        </button>
                      </div>
                    </div>

                  )}
                  
                  <button 
                    disabled={loading} 
                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4" 
                    type="submit"
                  >
                    <span>{loading ? 'Processing...' : (isLoginMode ? 'Sign In' : 'Create Unit')}</span>
                    <span className="material-symbols-outlined text-sm">bolt</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Target Email</label>
                    <input required disabled={otpSent} value={otpEmail} onChange={e => setOtpEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500/50 rounded-xl py-3.5 px-5 text-slate-900 font-medium transition-all outline-none" type="email" placeholder="name@neuralnurture.com" />
                  </div>
                  {otpSent && (
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">6-Digit Access Code</label>
                        <input required value={otpCode} onChange={e => setOtpCode(e.target.value)} className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500/50 rounded-xl py-4 px-6 text-slate-900 font-bold tracking-[0.5em] text-center text-xl transition-all outline-none" type="text" maxLength={6} placeholder="••••••" />
                      </div>
                      <button type="button" onClick={() => setOtpSent(false)} className="w-full text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Wrong email? Change it</button>
                    </div>
                  )}

                  <button 
                    disabled={loading} 
                    className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-3 disabled:opacity-50" 
                    type="submit"
                  >
                    <span className="material-symbols-outlined text-sm">{otpSent ? 'vpn_key' : 'send'}</span>
                    <span>{loading ? 'Processing...' : (otpSent ? 'Verify Code' : 'Request OTP')}</span>
                  </button>
                </form>
              )}
            </motion.div>
          </AnimatePresence>

          {isLoginMode && (
            <div className="mt-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[1px] flex-1 bg-slate-200"></div>
                <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Third Party Entry</span>
                <div className="h-[1px] flex-1 bg-slate-200"></div>
              </div>


              <button 
                onClick={handleGoogleLogin} 
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-black font-bold text-xs transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.49h4.84c-.21 1.12-.84 2.07-1.79 2.71v2.25h2.91c1.7-1.56 2.68-3.87 2.68-6.61z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.25c-.81.54-1.85.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33C2.43 15.89 5.49 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.97 10.73c-.18-.54-.28-1.12-.28-1.73s.1-1.19.28-1.73V4.94H.95C.35 6.13 0 7.52 0 9s.35 2.87.95 4.06l3.02-2.33z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0 5.49 0 2.43 2.11.95 5.14l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => setIsOtpMode(!isOtpMode)}
                  className="text-[9px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {isOtpMode ? 'Return to Password Login' : 'Sign in with One-Time Password'}
                </button>
              </div>

            </div>
          )}
        </div>

        <footer className="mt-8 flex justify-center items-center gap-6 opacity-60">
          <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-slate-400">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            <span>End-to-End SSL</span>
          </div>
          <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-widest text-slate-400">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            <span>GDPR Compliant</span>
          </div>
        </footer>

      </motion.main>
    </div>
  );
}
