"use client";

/** Placeholder — Phase 2 component. Will be replaced with Google Maps JS API when key is added. */
export default function MapPicker({ onLocationSelect }) {
  return (
    <div className="h-64 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200">
      <div className="text-center space-y-2">
        <span className="material-symbols-outlined text-4xl text-slate-300">map</span>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Map Picker · Phase 2</p>
        <p className="text-xs text-slate-400">Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable</p>
      </div>
    </div>
  );
}
