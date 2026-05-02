'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const DoctorsMap = dynamic(() => import('@/components/DoctorsMap'), { ssr: false });

const FILTERS = [
  { key: 'nearestDistance', label: 'Nearest', icon: 'location_on', desc: 'Closest to you right now' },
  { key: 'bestRating', label: 'Best Rating', icon: 'star', desc: 'Highest patient reviews' },
  { key: 'criticalCapacity', label: 'Critical Capacity', icon: 'emergency', desc: 'High rating + trusted for serious cases' },
  { key: 'openNow', label: 'Open Now', icon: 'schedule', desc: 'Available for walk-in or same-day slot' },
];

function DoctorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const specialtyParam = searchParams.get('specialty');

  const [activeFilter, setActiveFilter] = useState('nearestDistance');
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState(null);
  const [locationName, setLocationName] = useState('Detecting location...');

  const locateUser = () => {
    setLocationName('Detecting location...');
    if (!navigator.geolocation) {
      setLocationName('Indore, MP');
      setUserCoords({ lat: 22.7196, lng: 75.8577 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserCoords({ lat, lng });
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Your Location';
          setLocationName(`${city}, ${data.address?.state || ''}`);
        } catch {
          setLocationName('Your Location');
        }
      },
      () => {
        setUserCoords({ lat: 22.7196, lng: 75.8577 });
        setLocationName('Indore, MP (default)');
      }
    );
  };

  const fetchHospitals = async (coords, filter) => {
    setLoading(true);
    try {
      const lat = coords?.lat ?? 22.7196;
      const lng = coords?.lng ?? 75.8577;
      const params = new URLSearchParams({ lat, lng, filter });
      if (specialtyParam) params.set('specialty', specialtyParam);
      const res = await fetch(`/api/doctors/nearby?${params}`);
      const data = await res.json();
      setHospitals(data.hospitals || []);
    } catch {
      setHospitals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { locateUser(); }, []);

  useEffect(() => {
    fetchHospitals(userCoords, activeFilter);
  }, [userCoords, activeFilter, specialtyParam]);

  const urgencyColor = (openNow) => openNow ? 'text-emerald-600' : 'text-slate-400';

  return (
    <main className="pt-20 md:pt-24 pb-4 md:pb-24 px-4 md:px-8 max-w-[1600px] mx-auto md:h-screen flex flex-col md:overflow-hidden bg-background font-sans overflow-y-auto">

      {/* Header */}
      <section className="mb-8 shrink-0">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-block px-5 py-2 rounded-full bg-surface-container-highest text-primary text-[10px] font-bold uppercase tracking-[0.3em] border border-outline-variant">Specialist Matching Active</span>
              {specialtyParam && (
                <span className="inline-block px-5 py-2 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-[0.3em] shadow-lg shadow-blue-600/20">
                  Filtering: {specialtyParam}
                </span>
              )}
            </div>
            <h2 className="text-3xl md:text-6xl font-extrabold font-headline tracking-tighter text-on-background">Find Specialists</h2>
            <p className="text-on-surface-variant mt-1 text-base font-medium">Nearby hospitals and clinics · Real distance · Live availability</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-5 py-3 bg-surface-container-low rounded-full flex items-center gap-3 border border-outline-variant shadow-sm">
              <span className="material-symbols-outlined text-secondary text-sm">location_on</span>
              <span className="font-bold text-xs text-on-background uppercase tracking-widest truncate max-w-[160px]">{locationName}</span>
            </div>
            {specialtyParam && (
              <button onClick={() => router.push('/doctors')} className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center shadow border border-red-100 hover:bg-red-500 hover:text-white transition-all">
                <span className="material-symbols-outlined">filter_list_off</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Smart Filters */}
        <div className="flex gap-3 mt-6 overflow-x-auto no-scrollbar pb-2">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all whitespace-nowrap text-[11px] font-black uppercase tracking-widest ${
                activeFilter === f.key
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 font-medium mt-2 pl-1">
          {FILTERS.find(f => f.key === activeFilter)?.desc}
        </p>
      </section>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 min-h-0 mb-4">

        {/* Hospital List */}
        <div className="w-full md:w-2/5 md:overflow-y-auto pr-0 md:pr-4 custom-scrollbar space-y-4 md:space-y-5 pb-4 md:pb-10">
          {loading ? (
            <div className="text-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-on-surface-variant font-bold uppercase tracking-widest text-[10px]">Matching Specialists...</p>
            </div>
          ) : hospitals.length > 0 ? hospitals.map((h, idx) => (
            <div key={h.id || idx} className="group relative bg-surface-container-low rounded-3xl p-7 transition-all hover:bg-surface-container border border-outline-variant/30 shadow-sm overflow-hidden">
              {idx === 0 && (
                <div className="absolute top-0 right-0 bg-primary text-on-primary px-5 py-1.5 rounded-bl-3xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  Top Match
                </div>
              )}

              <div className="flex gap-5 mt-2">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg border border-outline-variant bg-surface-container-highest flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-primary/40">local_hospital</span>
                  </div>
                  <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center border-4 border-surface-container-low text-[10px] font-black ${h.openNow ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white'}`}>
                    {h.openNow ? '✓' : '—'}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-extrabold font-headline text-on-background tracking-tight leading-tight truncate">{h.name}</h3>
                  <p className="text-primary font-bold text-[10px] mt-2 uppercase tracking-widest truncate">{h.specialties?.join(' · ')}</p>
                  <p className="text-[10px] text-on-surface-variant mt-1 font-medium truncate">{h.address}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className="flex items-center gap-1 text-amber-500 text-[11px] font-black">
                      <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      {h.rating}
                      <span className="text-slate-400 font-normal">({h.reviewCount?.toLocaleString('en-IN')})</span>
                    </span>
                    {h.distanceKm != null && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">distance</span>
                        {h.distanceKm} km
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-outline-variant/30 flex items-center justify-between flex-wrap gap-3">
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 ${urgencyColor(h.openNow)}`}>
                    <span className="material-symbols-outlined text-[12px]">schedule</span>
                    {h.openNow ? h.availableSlot || 'Open Now' : 'Closed · ' + (h.availableSlot || 'Call ahead')}
                  </span>
                  {h.consultationFee && (
                    <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">payments</span>
                      ₹{h.consultationFee} consultation
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {h.phone && (
                    <a href={`tel:${h.phone}`} className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">phone</span>
                      Call
                    </a>
                  )}
                  <a href={h.googleMapsUri} target="_blank" rel="noopener noreferrer" className="px-4 py-2.5 neural-gradient text-on-primary text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">directions</span>
                    Directions
                  </a>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
              <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">person_search</span>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No results for current filter</p>
              <button onClick={() => setActiveFilter('nearestDistance')} className="mt-4 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:underline">
                Show All Nearby
              </button>
            </div>
          )}
        </div>

        {/* Map Panel */}
        <div className="w-full md:w-3/5 h-[220px] md:h-full rounded-3xl overflow-hidden relative shadow-inner bg-surface-container-lowest border border-outline-variant shrink-0 md:shrink">
          <DoctorsMap hospitals={hospitals} userCoords={userCoords} />
          <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-md p-5 rounded-2xl border border-outline-variant shadow-xl max-w-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full neural-gradient flex items-center justify-center text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-sm">map</span>
              </div>
              <div>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">Your Area</p>
                <p className="text-xs font-bold text-on-background tracking-tight truncate max-w-[140px]">{locationName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DoctorsPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading Clinical Hub...</div>}>
      <DoctorsContent />
    </Suspense>
  );
}
