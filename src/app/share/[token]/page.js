'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function SharedHealthFilePage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/medical/share?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError('Failed to load shared health file'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading health file...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="text-center max-w-md space-y-6">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-red-400 text-4xl">link_off</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Link Unavailable</h1>
          <p className="text-slate-500 font-medium">{error}</p>
          <p className="text-xs text-slate-400">Shared health file links expire after 24 hours and can be revoked by the patient at any time.</p>
        </div>
      </main>
    );
  }

  const { profile, records, expiresAt } = data;
  const expiresDate = new Date(expiresAt);

  const categoryIcon = (cat) => {
    if (cat === 'Prescription') return 'medication';
    if (cat === 'Analysis') return 'clinical_notes';
    if (cat === 'Surgery') return 'healing';
    return 'lab_research';
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-8 md:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-sm">favorite</span>
            </div>
            <span className="text-sm font-black tracking-widest uppercase text-white/60">Neural Nurture</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Shared Health File</h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">Read-only · Shared by patient · No login required</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-amber-400 font-bold">
            <span className="material-symbols-outlined text-sm">schedule</span>
            Expires: {expiresDate.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 space-y-8">

        {/* Patient Info */}
        <section className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Patient Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Name', value: profile?.full_name || '—' },
              { label: 'Age', value: profile?.age ? `${profile.age} yrs` : '—' },
              { label: 'Gender', value: profile?.gender || '—' },
              { label: 'Blood Type', value: profile?.blood_type || '—' },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">{item.label}</p>
                <p className="text-base font-black text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
          {profile?.allergies && (
            <div className="mt-6 pt-6 border-t border-slate-50">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-2">Known Allergies</p>
              <p className="text-sm font-medium text-slate-700">{profile.allergies}</p>
            </div>
          )}
        </section>

        {/* Medical Records */}
        <section>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">
            Medical Records ({records.length})
          </h2>
          {records.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-200">
              <p className="text-slate-400 font-bold text-sm">No records in this health file</p>
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex items-center gap-6">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-blue-600">{categoryIcon(r.category)}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-slate-900">{r.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{r.category} · {r.facility}</p>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide whitespace-nowrap">
                    {new Date(r.record_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="text-center text-xs text-slate-400 font-medium py-4">
          This is a read-only snapshot. Patient can revoke this link at any time.
          <br />Powered by Neural Nurture · DPDP Act 2023 aligned
        </div>
      </div>
    </main>
  );
}
