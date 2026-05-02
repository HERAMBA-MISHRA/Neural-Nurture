'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';

const getRole = () => {
  if (typeof window === 'undefined') return 'patient';
  return localStorage.getItem('nn_role') || 'patient';
};

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [userName, setUserName] = useState('U');
  const location = useStore(state => state.location);
  const setStoreLocation = useStore(state => state.setLocation);
  const [role, setRole] = useState('patient');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationRef = useRef(null);

  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Analysis Complete', desc: 'Symptom triage node processed.', time: '2m ago', icon: 'auto_awesome' },
    { id: 2, title: 'Profile Synced', desc: 'Identity data updated in mesh.', time: '1h ago', icon: 'sync' },
    { id: 3, title: 'Cloud Health', desc: 'Storage capacity at 12%.', time: '5h ago', icon: 'cloud_done' }
  ]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('nn_role');
      router.push('/');
    } catch {
      window.location.href = '/';
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const storedRole = getRole();
      setRole(storedRole);
      if (user) {
        const name = user.user_metadata?.first_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'U';
        setUserName(name[0].toUpperCase());
        localStorage.setItem('nn_name', name);
      } else {
        const name = localStorage.getItem('nn_name');
        if (name) setUserName(name[0].toUpperCase());
      }
    };
    fetchUser();

    if (location === 'Detecting...' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
          const data = await res.json();
          const city = data.address.city || data.address.town || data.address.village || 'Unknown';
          setStoreLocation(`${city}, ${data.address.country}`);
        } catch {
          setStoreLocation('Location Unavailable');
        }
      }, () => setStoreLocation('Permission Denied'));
    }

    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNavItems = () => {
    return [
      { name: 'Home', icon: 'home', href: '/dashboard' },
      { name: 'Chat', icon: 'chat_bubble', href: '/chat' },
      { name: 'Doctors', icon: 'medical_services', href: '/doctors' },
      { name: 'Files', icon: 'folder_shared', href: '/medical-file' },
      { name: 'Wellness', icon: 'self_care', href: '/wellness' },
    ];
  };

  const navItems = getNavItems();
  const noNavPages = ['/', '/login', '/register'];
  if (noNavPages.includes(pathname)) return null;

  return (
    <>
      {/* ── TOP HEADER ───────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-4 md:px-10 py-4 md:py-5 bg-white/40 backdrop-blur-3xl border-b border-white/20 lg:pl-32 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
        <Link href="/dashboard">
          <span className="text-xl md:text-2xl font-extrabold tracking-tighter text-primary font-headline cursor-pointer">Neural Nurture</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Location — desktop only */}
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface-container-low rounded-full border border-outline-variant">
            <span className="material-symbols-outlined text-secondary text-sm">location_on</span>
            <span className="text-xs font-bold text-on-surface-variant truncate max-w-[140px]">{location}</span>
          </div>

          {/* Notification Bell */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all relative ${isNotificationsOpen ? 'bg-primary text-white border-primary' : 'bg-surface-container-low border-outline-variant text-on-background hover:bg-surface-container-high'}`}
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {!isNotificationsOpen && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>

            {isNotificationsOpen && (
              <div className="absolute right-0 mt-4 w-[300px] md:w-[380px] bg-white/95 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_20px_70px_rgba(0,0,0,0.15)] border border-slate-100 p-6 animate-in fade-in slide-in-from-top-4 duration-300 z-50 overflow-hidden">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Notifications</h3>
                    <button onClick={() => setNotifications([])} className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:underline">Clear All</button>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? notifications.map((n) => (
                      <div key={n.id} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
                          <span className="material-symbols-outlined text-[18px]">{n.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-black text-slate-900 truncate">{n.title}</p>
                            <span className="text-[8px] font-bold text-slate-300 ml-2 flex-shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed mt-0.5">{n.desc}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="py-10 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-100">notifications_off</span>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mt-2">Log Clear</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Profile Avatar — desktop only */}
          <Link href="/profile" className="hidden md:flex w-10 h-10 bg-surface-container-high rounded-full items-center justify-center text-primary font-bold text-lg hover:scale-105 transition-transform shadow-lg border border-outline-variant">
            {userName}
          </Link>

          {/* Profile Avatar — mobile only */}
          <Link href="/profile" className="md:hidden w-9 h-9 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md">
            {userName}
          </Link>
        </div>
      </header>

      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 h-full w-24 bg-surface-container-lowest border-r border-outline-variant flex flex-col items-center py-10 z-[5] hidden lg:flex shadow-2xl">
        <div className="flex flex-col gap-8 flex-1 mt-20">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href} className="relative group">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isActive ? 'neural-gradient text-on-primary shadow-lg shadow-primary/20' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'}`}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{item.icon}</span>
                </div>
                <div className="absolute left-full ml-4 px-3 py-1 bg-surface-container-highest text-on-background text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-outline-variant">
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-auto flex flex-col items-center gap-6">
          <Link href="/profile" className="relative group">
            <div className="w-12 h-12 bg-surface-container-high rounded-full flex items-center justify-center text-primary font-bold text-lg hover:scale-105 transition-transform shadow-lg border border-outline-variant">
              {userName}
            </div>
            <div className="absolute left-full ml-4 px-3 py-1 bg-surface-container-highest text-on-background text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-outline-variant">Profile</div>
          </Link>
          <button onClick={handleLogout} className="w-12 h-12 rounded-full flex items-center justify-center text-on-surface-variant hover:text-red-400 hover:bg-red-400/10 transition-all relative group">
            <span className="material-symbols-outlined">logout</span>
            <div className="absolute left-full ml-4 px-3 py-1 bg-surface-container-highest text-on-background text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-outline-variant">Sign Out</div>
          </button>
        </div>
      </aside>

      {/* ── MOBILE BOTTOM NAVIGATION BAR ─────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white/97 backdrop-blur-2xl border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch h-[60px]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all relative ${isActive ? 'text-blue-600' : 'text-slate-400'}`}
              >
                {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-blue-600 rounded-full"></div>}
                <span className="material-symbols-outlined text-[21px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className="text-[8px] font-black uppercase tracking-wider leading-none">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
