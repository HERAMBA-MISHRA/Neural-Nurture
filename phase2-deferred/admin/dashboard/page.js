"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
const secureStorage = { setItem: (k, v) => localStorage.setItem('nn_'+k, v), getItem: (k) => localStorage.getItem('nn_'+k), clear: () => {} };

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

export default function AdminDashboard() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = secureStorage.getItem('user_role');
    const adminAuth = sessionStorage.getItem('admin_auth');
    
    if (role === 'admin' || adminAuth === 'true') {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
    
    const timer = setTimeout(() => {
      setLoading(false);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    secureStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  const [activeTab, setActiveTab] = useState('doctors');
  const [formData, setFormData] = useState({ name: '', specialty: '', location: '', latitude: '', longitude: '', fee: '', rating: '4.5', availability: 'Available Today' });
  const [status, setStatus] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
      else setUsersError(data.error || "Error fetching users");
    } catch (err) {
      setUsersError("Connection failed");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized && activeTab === 'users' && users.length === 0) {
      fetchUsers();
    }
  }, [activeTab, isAuthorized]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Processing...');
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const d = await res.json();
      if (res.ok) {
        if (d.warning) {
          setStatus(`Saved with Warning: ${d.warning}`);
        } else {
          setStatus('Successfully saved!');
        }
        setFormData({ name: '', specialty: '', location: '', latitude: '', longitude: '', fee: '', rating: '4.5', availability: 'Available Today' });
      } else {
        setStatus(`Error: ${d.error}`);
      }
    } catch (err) {
      setStatus('Network error');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background font-bold text-primary text-[10px] uppercase tracking-widest">Initialising Console...</div>;

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <span className="text-[120px] font-black text-slate-100 block leading-none">404</span>
        <h1 className="text-2xl font-extrabold text-slate-900 -mt-6">Clinical Node Restricted</h1>
        <p className="text-slate-500 font-medium mt-2 max-w-xs mx-auto">Access denied or management path does not exist.</p>
        <Link href="/" className="mt-8 px-8 py-3 bg-primary text-white font-bold rounded-full text-sm shadow-lg hover:bg-blue-600 transition-all">Return to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start p-6 py-12 pt-32">
      <div className="max-w-4xl w-full bg-white rounded-[32px] border border-slate-200 shadow-2xl overflow-hidden">
        
        <div className="bg-primary p-12 text-slate-900 text-center relative overflow-hidden">
          {/* Decorative background circle */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          
          <Link href="/dashboard" className="absolute left-10 top-10 flex items-center gap-2 text-slate-900/70 hover:text-slate-900 transition-colors text-xs font-bold uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back
          </Link>
          <button onClick={handleLogout} className="absolute right-10 top-10 flex items-center gap-2 text-slate-900/70 hover:text-red-300 transition-colors font-bold text-xs uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">logout</span>
            Sign Out
          </button>
          
          <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-900/40 mb-2 block">Central Management Console</span>
          <h1 className="text-4xl font-black tracking-tighter mb-2 text-slate-900">Clinical Control Hub</h1>
          <p className="text-slate-900/60 text-sm font-medium">Precision control over clinical datasets and personnel access.</p>
        </div>

        <div className="flex bg-slate-100 p-2">
          <button 
            onClick={() => setActiveTab('doctors')}
            className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-[0.2em] transition-all rounded-xl ${activeTab === 'doctors' ? 'bg-surface-container text-primary shadow-lg' : 'text-slate-900/30 hover:text-slate-900'}`}
          >
            Provision Doctor
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-4 font-bold text-[10px] uppercase tracking-[0.2em] transition-all rounded-xl ${activeTab === 'users' ? 'bg-surface-container text-primary shadow-lg' : 'text-slate-900/30 hover:text-slate-900'}`}
          >
            Audit Users
          </button>
        </div>

        <div className="p-10">
          {activeTab === 'doctors' && (
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-900/30 uppercase tracking-[0.2em] ml-1">Full Practitioner Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-slate-900 font-medium" placeholder="Dr. Julianne Moore" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-900/30 uppercase tracking-[0.2em] ml-1">Clinical Specialty</label>
                    <input type="text" required value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} className="w-full bg-slate-50 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-slate-900 font-medium" placeholder="Senior Cardiologist" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-900/30 uppercase tracking-[0.2em] ml-1">Consultation Fee</label>
                    <input type="text" value={formData.fee} onChange={e => setFormData({...formData, fee: e.target.value})} className="w-full bg-slate-50 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-slate-900 font-medium" placeholder="₹1,200" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-900/30 uppercase tracking-[0.2em] ml-1">Practitioner Rating (1-5)</label>
                    <input type="text" required value={formData.rating} onChange={e => setFormData({...formData, rating: e.target.value})} className="w-full bg-slate-50 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-slate-900 font-medium" placeholder="4.9" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-900/30 uppercase tracking-[0.2em] ml-1">Clinical Availability</label>
                    <input type="text" value={formData.availability} onChange={e => setFormData({...formData, availability: e.target.value})} className="w-full bg-slate-50 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-slate-900 font-medium" placeholder="Available Today" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-900/30 uppercase tracking-[0.2em] ml-1">Primary Clinical Address</label>
                  <input type="text" required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-slate-900 font-medium" placeholder="City General Hospital, Main Wing" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-900/30 uppercase tracking-[0.2em] ml-1">Latitudinal Pointer</label>
                    <input type="text" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} className="w-full bg-slate-50 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-slate-900 font-mono" placeholder="28.6139" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-900/30 uppercase tracking-[0.2em] ml-1">Longitudinal Pointer</label>
                    <input type="text" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} className="w-full bg-slate-50 border border-white/10 rounded-2xl p-4 outline-none focus:border-primary/50 text-slate-900 font-mono" placeholder="77.2090" />
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[24px] border border-white/10">
                  <p className="text-[10px] font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[16px]">location_searching</span>
                    Geospatial Mapping
                  </p>
                  <div className="h-[300px] rounded-2xl overflow-hidden border border-white/10 grayscale contrast-125 opacity-80 hover:opacity-100 transition-opacity">
                    <MapPicker 
                      onLocationSelect={(lat, lng) => setFormData({...formData, latitude: lat.toString(), longitude: lng.toString()})} 
                    />
                  </div>
                  <p className="text-[9px] text-slate-900/30 mt-3 font-bold uppercase tracking-widest text-center">Interact with the grid to set precision coordinates.</p>
                </div>
                
                <button type="submit" className="w-full py-5 bg-primary hover:bg-blue-600 text-slate-900 font-black text-xs uppercase tracking-[0.3em] rounded-2xl mt-6 shadow-2xl shadow-primary/20 transition-all">
                  Commit to Neural Database
                </button>
                
                {status && (
                  <div className={`p-4 rounded-xl mt-4 text-center font-bold text-[10px] uppercase tracking-widest ${status.includes('Error') || status.includes('Failed') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {status}
                  </div>
                )}
              </form>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="animate-in fade-in duration-500">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black tracking-tighter text-slate-900">Registered Personnel</h2>
                <button onClick={fetchUsers} className="flex items-center gap-2 text-[10px] text-primary hover:text-slate-900 font-bold bg-primary/10 px-5 py-2.5 rounded-full transition-all uppercase tracking-widest">
                  <span className="material-symbols-outlined text-[16px]">refresh</span> Sync
                </button>
              </div>

              {usersLoading ? (
                <div className="text-center py-20 text-slate-900/20 font-bold uppercase tracking-widest text-[10px]">Synchronizing...</div>
              ) : usersError ? (
                <div className="bg-red-500/5 border border-red-500/10 p-10 rounded-3xl text-center">
                  <span className="material-symbols-outlined text-red-500 text-5xl mb-4">security</span>
                  <h3 className="text-slate-900 font-bold text-lg mb-2 tracking-tight">Access Gate Locked</h3>
                  <p className="text-slate-900/40 text-xs max-w-sm mx-auto leading-relaxed">{usersError}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-3xl border border-white/5 bg-slate-100">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-900/40 text-[9px] uppercase tracking-[0.2em]">
                        <th className="p-6 font-black">Identity</th>
                        <th className="p-6 font-black">System Role</th>
                        <th className="p-6 font-black">Enrollment</th>
                        <th className="p-6 font-black">Last Sync</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {users.length > 0 ? users.map((u, i) => (
                        <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                          <td className="p-6">
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-bold">{u.name}</span>
                              <span className="text-slate-900/30 text-[10px]">{u.email}</span>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="px-3 py-1 bg-slate-50 text-slate-900/40 rounded-full font-bold uppercase tracking-widest text-[9px]">Patient</span>
                          </td>
                          <td className="p-6 text-slate-900/40 font-medium">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="p-6 text-slate-900/40 font-medium">{u.last_sign_in ? new Date(u.last_sign_in).toLocaleDateString() : 'Never'}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan="4" className="p-12 text-center text-slate-900/20 font-bold uppercase tracking-[0.2em]">Empty Node Dataset</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
