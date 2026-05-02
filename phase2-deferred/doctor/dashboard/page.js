"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
const secureStorage = { setItem: (k, v) => localStorage.setItem('nn_'+k, v), getItem: (k) => localStorage.getItem('nn_'+k), clear: () => {} };

export default function DoctorDashboard() {
  const [userName, setUserName] = useState('Doctor');
  const [activeTab, setActiveTab] = useState('overview');
  const [isSetupComplete, setIsSetupComplete] = useState(true);
  const [setupStep, setSetupStep] = useState(1);
  const [setupData, setSetupData] = useState({
    specialty: '',
    experience: '',
    fee: '',
    location: '',
    latitude: '',
    longitude: '',
    rating: '4.9',
    availability: 'Available Today'
  });
  
  const router = useRouter();

  useEffect(() => {
    const storedName = secureStorage.getItem('user_name');
    const role = secureStorage.getItem('user_role');
    const setupStatus = secureStorage.getItem('doctor_setup_complete');
    
    // Auto-fill some data from storage if it exists
    const storedSpecialty = secureStorage.getItem('doctor_specialty');
    if (storedSpecialty) setSetupData(prev => ({ ...prev, specialty: storedSpecialty }));

    if (role !== 'doctor' && role !== 'admin') {
      window.location.href = '/login';
      return;
    }
    
    if (setupStatus === 'false') {
      setIsSetupComplete(false);
    }
    
    if (storedName) setUserName(storedName);
  }, [router]);

  const handleSetupSubmit = async () => {
    // Save to storage
    secureStorage.setItem('doctor_setup_complete', 'true');
    secureStorage.setItem('doctor_specialty', setupData.specialty);
    setIsSetupComplete(true);
  };

  const handleLogout = () => {
    secureStorage.clear();
    window.location.href = '/';
  };

  if (!isSetupComplete) {
    // ... (Keep the existing onboarding UI, but maybe update colors to clinical blue)
    return (
      <main className="min-h-screen bg-[#f8faff] flex items-center justify-center p-6 antialiased">
        <div className="max-w-md w-full bg-white p-10 rounded-[32px] border border-slate-200 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <span className="material-symbols-outlined text-3xl">medical_information</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Onboarding</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Step {setupStep} of 3 • Profile Matrix</p>
          </div>

          {setupStep === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Clinical Specialization</label>
                <input 
                  type="text" 
                  placeholder="e.g. Senior Cardiologist" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 outline-none focus:border-primary/50 text-slate-900 transition-all font-medium"
                  value={setupData.specialty}
                  onChange={e => setSetupData({...setupData, specialty: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Years of Experience</label>
                <input 
                  type="text" 
                  placeholder="e.g. 12 Years" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 outline-none focus:border-primary/50 text-slate-900 transition-all font-medium"
                  value={setupData.experience}
                  onChange={e => setSetupData({...setupData, experience: e.target.value})}
                />
              </div>
              <button onClick={() => setSetupStep(2)} className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">Continue</button>
            </div>
          )}

          {setupStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Consultation Fee</label>
                <input 
                  type="text" 
                  placeholder="e.g. ₹1200" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 outline-none focus:border-primary/50 text-slate-900 transition-all font-medium"
                  value={setupData.fee}
                  onChange={e => setSetupData({...setupData, fee: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Clinic Location Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. City General Hospital" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 outline-none focus:border-primary/50 text-slate-900 transition-all font-medium"
                  value={setupData.location}
                  onChange={e => setSetupData({...setupData, location: e.target.value})}
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setSetupStep(1)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-full font-bold hover:bg-slate-200 transition-all">Back</button>
                <button onClick={() => setSetupStep(3)} className="flex-[2] bg-primary text-white py-4 rounded-full font-bold shadow-lg shadow-primary/20">Next</button>
              </div>
            </div>
          )}

          {setupStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
               <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                 <span className="material-symbols-outlined text-4xl text-primary mb-2">location_on</span>
                 <p className="text-xs font-bold text-primary">Clinic Coordinates</p>
                 <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Please paste your Google Maps coordinates below to enable precise clinical mapping for patients.</p>
               </div>
               <div>
                <input 
                  type="text" 
                  placeholder="Lat, Lng (e.g. 28.61, 77.20)" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 outline-none focus:border-primary/50 text-slate-900 transition-all text-center font-mono"
                  value={setupData.latitude && setupData.longitude ? `${setupData.latitude}, ${setupData.longitude}` : ''}
                  onChange={e => {
                    const parts = e.target.value.split(',');
                    if (parts.length === 2) {
                      setSetupData({...setupData, latitude: parts[0].trim(), longitude: parts[1].trim()});
                    }
                  }}
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setSetupStep(2)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-full font-bold hover:bg-slate-200 transition-all">Back</button>
                <button onClick={handleSetupSubmit} className="flex-[2] bg-emerald-600 text-white py-4 rounded-full font-bold shadow-lg hover:bg-emerald-700 transition-all">Complete Setup</button>
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-24 px-6 max-w-7xl mx-auto space-y-12 min-h-screen">
      {/* Hero Section */}
      <section className="relative">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Precision Care Network</span>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-slate-900">Dr. {userName}</h1>
            <p className="text-slate-500 max-w-md text-lg font-medium leading-relaxed">{setupData.specialty || 'General Practitioner'} • Specialist Portal</p>
          </div>
          <div className="flex gap-4">
             <button onClick={handleLogout} className="bg-white text-slate-600 px-8 py-4 rounded-full font-bold flex items-center gap-3 transition-all hover:bg-red-50 hover:text-red-600 shadow-sm border border-slate-200">
              <span className="material-symbols-outlined">logout</span>
              <span>Logout</span>
            </button>
            <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Overview
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'profile' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Profile
              </button>
            </div>
          </div>
        </div>
      </section>

      {activeTab === 'overview' ? (
        <>
          {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {[
          { label: 'Total Patients', value: '1,284', icon: 'groups', trend: '+12% this month' },
          { label: 'Today\'s Appointments', value: '18', icon: 'event', trend: '4 remaining' },
          { label: 'Critical Cases', value: '3', icon: 'priority_high', trend: 'Action required' },
          { label: 'Avg. Consultation', value: '15m', icon: 'timer', trend: 'Optimized flow' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm transition-all hover:bg-slate-50">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{stat.trend}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
            <h3 className="text-4xl font-extrabold text-slate-900 mt-2 tracking-tighter">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Feed */}
        <div className="md:col-span-8 space-y-8">
          <div className="bg-white rounded-3xl p-10 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-bold tracking-tighter flex items-center gap-4">
                <span className="material-symbols-outlined text-primary">patient_list</span>
                Recent Patient Activity
              </h2>
              <button className="text-sm font-bold text-primary hover:underline">View All Patients</button>
            </div>
            
            <div className="space-y-4">
              {[
                { name: 'Sarah Miller', condition: 'Hypertension Management', time: '10 mins ago', status: 'In Review' },
                { name: 'James Wilson', condition: 'Post-Op Follow-up', time: '45 mins ago', status: 'Awaiting Vitals' },
                { name: 'Emma Davis', condition: 'Routine Physical', time: '2 hours ago', status: 'Completed' },
              ].map((patient, idx) => (
                <div key={idx} className="flex items-center justify-between p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-600/30 transition-all cursor-pointer group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center font-bold text-primary group-hover:bg-primary group-hover:text-white transition-all">
                      {patient.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-slate-900">{patient.name}</h4>
                      <p className="text-sm text-slate-500 font-medium">{patient.condition}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-primary mb-1 uppercase tracking-widest">{patient.status}</p>
                    <p className="text-[10px] text-slate-500/60 font-bold">{patient.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="md:col-span-4 space-y-8">
          <div className="neural-gradient rounded-3xl p-10 text-on-primary shadow-xl shadow-primary/10 relative overflow-hidden group">
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80">Next Appointment</span>
              <h3 className="text-4xl font-extrabold mt-4 tracking-tighter leading-tight">Marcus Thorne</h3>
              <p className="text-on-primary font-bold opacity-90 mt-1 uppercase text-xs tracking-widest">Diabetes Screening</p>
              
              <div className="mt-10 space-y-5">
                <div className="flex items-center gap-5 bg-white/10 p-5 rounded-2xl backdrop-blur-md border border-white/10">
                  <span className="font-bold text-xl tracking-tight">Today • 2:30 PM</span>
                </div>
              </div>
              
              <button className="w-full mt-10 bg-white text-primary py-5 rounded-full text-sm font-bold shadow-lg hover:scale-105 transition-transform">
                Start Consultation
              </button>
            </div>
          </div>

          <div className="bg-white p-10 rounded-3xl border border-slate-200 shadow-sm">
            <h4 className="font-bold text-primary uppercase text-[10px] tracking-[0.3em] mb-6">AI Diagnostics Assist</h4>
            <div className="p-6 rounded-2xl bg-white border border-outline-variant/20 space-y-4">
              <div className="flex items-center gap-3 text-emerald-600">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Model 4.0 Active</span>
              </div>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                MediAI has processed 42 sets of vitals today. No anomalies detected in your current patient batch.
              </p>
            </div>
          </div>
        </div>
      </div>
      </>
    ) : (
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white rounded-[40px] p-12 border border-slate-200 shadow-xl max-w-4xl">
            <h2 className="text-3xl font-bold tracking-tighter mb-10 flex items-center gap-4">
              <span className="material-symbols-outlined text-primary text-4xl">clinical_notes</span>
              Clinical Profile Management
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Clinical Specialty</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:border-primary/50 text-slate-900 font-bold transition-all shadow-inner"
                    value={setupData.specialty}
                    onChange={e => setSetupData({...setupData, specialty: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Consultation Fee</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:border-primary/50 text-slate-900 font-bold transition-all shadow-inner"
                    value={setupData.fee}
                    onChange={e => setSetupData({...setupData, fee: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Current Rating</label>
                  <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                    <span className="material-symbols-outlined text-yellow-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-bold text-slate-900">{setupData.rating}</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest ml-auto">Verified by Platform</span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Clinical Availability</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:border-primary/50 text-slate-900 font-bold transition-all shadow-inner"
                    value={setupData.availability}
                    onChange={e => setSetupData({...setupData, availability: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Clinic Address</label>
                  <textarea 
                    rows="4"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 outline-none focus:border-primary/50 text-slate-900 font-bold transition-all shadow-inner resize-none"
                    value={setupData.location}
                    onChange={e => setSetupData({...setupData, location: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-slate-100 flex justify-between items-center">
              <p className="text-xs text-slate-400 font-medium max-w-sm">
                Updating your clinical profile will immediately sync changes with the patient search engine and map nodes.
              </p>
              <button 
                onClick={() => {
                  secureStorage.setItem('doctor_specialty', setupData.specialty);
                  alert('Clinical profile updated successfully!');
                }}
                className="bg-primary text-white px-12 py-5 rounded-full font-black text-sm shadow-2xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
              >
                Sync Profile Data
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
