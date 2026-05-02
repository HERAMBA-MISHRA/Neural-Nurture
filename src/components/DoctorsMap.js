"use client";

/**
 * Hospital map placeholder.
 * Shows hospital cards with Google Maps links.
 * Swap: when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set, replace this component
 * with a Google Maps JavaScript API embed — one file change.
 */
export default function DoctorsMap({ hospitals = [], userCoords }) {
  if (!hospitals.length) {
    return (
      <div className="h-full w-full bg-slate-900 flex items-center justify-center rounded-3xl">
        <div className="text-center space-y-3">
          <span className="material-symbols-outlined text-5xl text-slate-600">map</span>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">No locations to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#0a0c14] rounded-3xl overflow-hidden relative flex flex-col">
      {/* Map header */}
      <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">
            {hospitals.length} facilities found
          </span>
        </div>
        {userCoords && (
          <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
            {userCoords.lat.toFixed(4)}, {userCoords.lng.toFixed(4)}
          </span>
        )}
      </div>

      {/* Hospital pin cards */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {hospitals.map((h, idx) => (
          <div
            key={h.id || idx}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black ${
                  idx === 0 ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/60'
                }`}>
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm truncate">{h.name}</p>
                  <p className="text-white/40 text-[10px] font-medium truncate mt-0.5">{h.address}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-amber-400 text-[10px] font-black">
                      <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      {h.rating}
                    </span>
                    <span className="text-white/30 text-[10px]">({h.reviewCount?.toLocaleString('en-IN')})</span>
                    {h.distanceKm != null && (
                      <span className="text-emerald-400 text-[10px] font-bold">{h.distanceKm} km</span>
                    )}
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${h.openNow ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                      {h.openNow ? 'OPEN' : 'CLOSED'}
                    </span>
                  </div>
                </div>
              </div>
              <a
                href={h.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-blue-600/20 text-blue-400 rounded-xl flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shrink-0"
                title="Open in Google Maps"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-6 py-3 bg-white/5 border-t border-white/10">
        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest text-center">
          Google Maps integration · Add API key to enable full map
        </p>
      </div>
    </div>
  );
}
