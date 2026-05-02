"use client";
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const INGREDIENTS = [
  'Dal (moong/masoor/chana)', 'Chawal (rice)', 'Atta (whole wheat)', 'Eggs',
  'Aloo (potato)', 'Sabzi (seasonal vegetable)', 'Milk', 'Curd (dahi)',
  'Paneer', 'Poha', 'Suji (semolina)', 'Rajma', 'Chole (chickpeas)',
  'Palak (spinach)', 'Banana', 'Tomato', 'Onion', 'Besan (gram flour)',
  'Peanuts', 'Jaggery (gud)', 'Oil', 'Ghee',
];

const DEFAULT_ACTIVITIES = {
  Monday:    [{ name: 'Morning Walk', duration: 20, intensity: 'Low',      instructions: 'Walk at a comfortable pace. Focus on steady breathing.' }],
  Tuesday:   [{ name: 'Surya Namaskar', duration: 15, intensity: 'Moderate', instructions: '6 rounds at moderate pace. Pause in each pose for 2 breaths.' }, { name: 'Pranayama', duration: 10, intensity: 'Low', instructions: 'Anulom-Vilom: alternate nostril breathing for 5 min, then deep breathing.' }],
  Wednesday: [{ name: 'Brisk Walk', duration: 25, intensity: 'Moderate', instructions: 'Walk faster than usual — you should feel slightly out of breath.' }, { name: 'Meditation', duration: 10, intensity: 'Low', instructions: 'Sit comfortably, close eyes, focus on breath. Let thoughts pass without reacting.' }],
  Thursday:  [{ name: 'Yoga Nidra / Rest', duration: 20, intensity: 'Low', instructions: 'Lie down, follow a guided body scan. Allow full relaxation.' }],
  Friday:    [{ name: 'Morning Walk', duration: 20, intensity: 'Low', instructions: 'Light walk. Good morning light helps regulate energy and sleep.' }, { name: 'Core Exercises', duration: 15, intensity: 'Moderate', instructions: 'Cat-cow, bird-dog, and seated twists. No crunches — focus on stability.' }],
  Saturday:  [{ name: 'Cycling or Walk', duration: 30, intensity: 'Moderate', instructions: 'Sustained activity at a pace where you can still hold a conversation.' }, { name: 'Stretching', duration: 10, intensity: 'Low', instructions: 'Full body stretch — hamstrings, shoulders, back. Hold each for 20 seconds.' }],
  Sunday:    [{ name: 'Family Walk', duration: 20, intensity: 'Low', instructions: 'Slow leisure walk — social and light movement counts.' }, { name: 'Weekly Reflection', duration: 10, intensity: 'Low', instructions: 'Review your week: what went well, what to improve. Set one intention for next week.' }],
};

const MED_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night', 'After meals', 'Before meals'];

const INTENSITY_STYLE = {
  Low:      'bg-emerald-100 text-emerald-700',
  Moderate: 'bg-amber-100 text-amber-700',
  High:     'bg-red-100 text-red-700',
};

export default function WellnessPage() {
  const [activeTab, setActiveTab] = useState('diet');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dailyLog, setDailyLog] = useState({ water_intake: 0, vitamin_taken: false });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Diet Planner state
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [budget, setBudget] = useState(100);
  const [dietPlan, setDietPlan] = useState(null);
  const [isGeneratingDiet, setIsGeneratingDiet] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);

  // Wellness Calendar state
  const [activityTicks, setActivityTicks] = useState({});
  const [weekTicks, setWeekTicks] = useState({});   // { 'YYYY-MM-DD': { key: bool } }
  const [medicineList, setMedicineList] = useState([]);
  const [newMedicine, setNewMedicine] = useState('');
  const [newMedTime, setNewMedTime] = useState('After meals');
  const [wellnessPlan, setWellnessPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (userId) loadDayData(); }, [selectedDate, userId]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const plan = localStorage.getItem(`nn_wellness_plan_${user.id}`);
    setWellnessPlan(plan ? JSON.parse(plan) : null);

    const meds = localStorage.getItem(`nn_medicines_${user.id}`);
    setMedicineList(meds ? JSON.parse(meds) : []);

    // Build week ticks map and compute streak
    const wt = {};
    let s = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = d.toISOString().split('T')[0];
      const stored = localStorage.getItem(`nn_ticks_${user.id}_${k}`);
      wt[k] = stored ? JSON.parse(stored) : {};
      const hasActivity = stored && Object.values(JSON.parse(stored)).some(v => v);
      if (i === 0 || s === i) { if (hasActivity) s = i + 1; }
    }
    setWeekTicks(wt);
    setStreak(s);
  };

  const loadDayData = async () => {
    setLoading(true);
    const dateStr = selectedDate.toISOString().split('T')[0];

    const { data: logData } = await supabase.from('wellness_logs').select('*')
      .eq('user_id', userId).eq('log_date', dateStr).single();
    setDailyLog(logData || { water_intake: 0, vitamin_taken: false });

    const stored = localStorage.getItem(`nn_ticks_${userId}_${dateStr}`);
    setActivityTicks(stored ? JSON.parse(stored) : {});
    setLoading(false);
  };

  const saveTicks = (newTicks) => {
    const dateStr = selectedDate.toISOString().split('T')[0];
    localStorage.setItem(`nn_ticks_${userId}_${dateStr}`, JSON.stringify(newTicks));
    setWeekTicks(prev => ({ ...prev, [dateStr]: newTicks }));
  };

  const updateLog = async (updates) => {
    if (!userId) return;
    const dateStr = selectedDate.toISOString().split('T')[0];
    await supabase.from('wellness_logs').upsert({ user_id: userId, log_date: dateStr, ...dailyLog, ...updates });
    setDailyLog(prev => ({ ...prev, ...updates }));
    toast.success('Updated');
  };

  // ── Diet Planner ──────────────────────────────────────────────────────────
  const toggleIngredient = (ing) => {
    setSelectedIngredients(prev =>
      prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
    );
  };

  const generateDietPlan = async () => {
    if (!selectedIngredients.length) { toast.error('Select at least 1 ingredient'); return; }
    setIsGeneratingDiet(true);
    try {
      const res = await fetch('/api/diet/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients: selectedIngredients, budget }),
      });
      const data = await res.json();
      if (data.success) {
        setDietPlan(data.plan);
        setShowDietModal(true);
        toast.success('7-day diet plan generated!');
      } else toast.error('Could not generate plan');
    } catch { toast.error('Connection error'); }
    finally { setIsGeneratingDiet(false); }
  };

  // ── Wellness Calendar ──────────────────────────────────────────────────────
  const toggleActivityTick = (activity) => {
    if (!userId) return;
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const key = `${dayName}_${activity.name}`;
    const newTicks = { ...activityTicks, [key]: !activityTicks[key] };
    setActivityTicks(newTicks);
    saveTicks(newTicks);
  };

  const addMedicine = () => {
    if (!newMedicine.trim()) return;
    const updated = [...medicineList, { name: newMedicine.trim(), time: newMedTime, taken: false }];
    setMedicineList(updated);
    setNewMedicine('');
    if (userId) localStorage.setItem(`nn_medicines_${userId}`, JSON.stringify(updated));
    toast.success('Medicine added');
  };

  const toggleMedicineTaken = (idx) => {
    const updated = medicineList.map((m, i) => i === idx ? { ...m, taken: !m.taken } : m);
    setMedicineList(updated);
    if (userId) localStorage.setItem(`nn_medicines_${userId}`, JSON.stringify(updated));
  };

  const removeMedicine = (idx) => {
    const updated = medicineList.filter((_, i) => i !== idx);
    setMedicineList(updated);
    if (userId) localStorage.setItem(`nn_medicines_${userId}`, JSON.stringify(updated));
  };

  const generateWellnessPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const res = await fetch('/api/wellness/generate-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (data.success) {
        setWellnessPlan(data.plan);
        if (userId) localStorage.setItem(`nn_wellness_plan_${userId}`, JSON.stringify(data.plan));
        toast.success('Wellness plan generated!');
      } else toast.error('Could not generate plan');
    } catch { toast.error('Connection error'); }
    finally { setIsGeneratingPlan(false); }
  };

  // ── PDF download ──────────────────────────────────────────────────────────
  const downloadDietPlanPDF = () => {
    if (!dietPlan) return;
    const win = window.open('', '_blank');
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>7-Day Diet Plan – Neural Nurture</title>
<style>
* { box-sizing:border-box;margin:0;padding:0; }
body { font-family:'Segoe UI',sans-serif;color:#0f172a;padding:32px; }
h1 { font-size:28px;font-weight:900;margin-bottom:4px; }
.sub { font-size:13px;color:#64748b;margin-bottom:24px; }
.note { background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 18px;margin-bottom:28px; }
.note-label { font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.15em;color:#2563eb;margin-bottom:4px; }
.note-text { font-size:13px;color:#1e40af; }
.day { margin-bottom:32px;page-break-inside:avoid; }
.day-title { font-size:18px;font-weight:900;border-bottom:2px solid #f1f5f9;padding-bottom:8px;margin-bottom:12px; }
.meals { display:grid;grid-template-columns:1fr 1fr;gap:12px; }
.meal { background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px; }
.meal-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:8px; }
.badge { font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;padding:3px 10px;border-radius:999px; }
.kcal { font-size:10px;font-weight:700;color:#94a3b8; }
.meal-name { font-size:14px;font-weight:900;color:#0f172a; }
.meal-desc { font-size:11px;color:#64748b;margin-top:4px;line-height:1.5; }
footer { margin-top:40px;font-size:11px;color:#94a3b8;text-align:center;border-top:1px solid #f1f5f9;padding-top:16px; }
@media print { .day { page-break-inside:avoid; } }
</style></head><body>
<h1>Your 7-Day Diet Plan</h1>
<p class="sub">₹${dietPlan.totalDailyBudget}/day &middot; Neural Nurture &middot; ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
${dietPlan.nutritionNotes ? `<div class="note"><p class="note-label">Nutrition Note</p><p class="note-text">${dietPlan.nutritionNotes}</p></div>` : ''}
${(dietPlan.days || []).map(day => `<div class="day">
<div class="day-title">${day.day}</div>
<div class="meals">
${(day.meals || []).map(meal => {
  const bg = meal.type === 'Breakfast' ? '#fef3c7' : meal.type === 'Lunch' ? '#dbeafe' : meal.type === 'Dinner' ? '#e0e7ff' : '#f1f5f9';
  const fg = meal.type === 'Breakfast' ? '#92400e' : meal.type === 'Lunch' ? '#1e40af' : meal.type === 'Dinner' ? '#3730a3' : '#475569';
  return `<div class="meal"><div class="meal-header"><span class="badge" style="background:${bg};color:${fg}">${meal.type}</span><span class="kcal">${meal.calories} kcal${meal.cost ? ` · ₹${meal.cost}` : ''}</span></div><p class="meal-name">${meal.name}</p><p class="meal-desc">${meal.description || ''}</p></div>`;
}).join('')}
</div></div>`).join('')}
<footer>Neural Nurture — Your Personal Wellness Companion</footer>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
    win.document.write(html);
    win.document.close();
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const getDaysStrip = () => {
    const days = [];
    const today = new Date();
    for (let i = -3; i < 4; i++) {
      const d = new Date(); d.setDate(today.getDate() + i); days.push(d);
    }
    return days;
  };

  const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

  const todayActivities = (() => {
    if (wellnessPlan?.days) {
      const planDay = wellnessPlan.days.find(d => d.day === dayName);
      if (planDay?.activities?.length) return planDay.activities;
    }
    return DEFAULT_ACTIVITIES[dayName] || [];
  })();

  const doneTodayCount = todayActivities.filter(a => activityTicks[`${dayName}_${a.name}`]).length;
  const totalToday = todayActivities.length;
  const progressPct = totalToday ? Math.round((doneTodayCount / totalToday) * 100) : 0;

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun
    const monday = new Date(d); monday.setDate(d.getDate() - ((day + 6) % 7));
    const target = new Date(monday); target.setDate(monday.getDate() + i);
    return target;
  });

  const getDayCompletion = (date) => {
    const k = date.toISOString().split('T')[0];
    const ticks = weekTicks[k] || {};
    return Object.values(ticks).some(v => v);
  };

  const medTimeColors = { Morning: 'bg-amber-100 text-amber-700', Afternoon: 'bg-orange-100 text-orange-700', Evening: 'bg-purple-100 text-purple-700', Night: 'bg-indigo-100 text-indigo-700', 'After meals': 'bg-blue-100 text-blue-700', 'Before meals': 'bg-teal-100 text-teal-700' };

  return (
    <main className="pt-20 md:pt-24 pb-8 px-4 md:px-8 max-w-7xl mx-auto font-body">

      {/* Hero */}
      <section className="mb-6 md:mb-10 relative overflow-hidden rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 bg-slate-950 text-white shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-10 right-10 w-96 h-96 bg-blue-600 rounded-full blur-[120px]" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-indigo-600 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-blue-500/10 border border-blue-500/20">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black tracking-[0.4em] uppercase text-blue-400">Wellness Intelligence</span>
            </div>
            <h1 className="text-2xl md:text-6xl font-black tracking-tighter leading-[0.9]">Diet &<br />Wellness</h1>
            <p className="text-slate-400 text-base md:text-lg font-medium max-w-md">Smart diet planner from your kitchen + daily wellness calendar.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setActiveTab('diet')}
              className={`px-7 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'diet' ? 'bg-white text-slate-950 shadow-xl' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              <span className="material-symbols-outlined block mb-1 mx-auto text-xl">restaurant_menu</span>
              Diet Planner
            </button>
            <button onClick={() => setActiveTab('calendar')}
              className={`px-7 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'calendar' ? 'bg-white text-slate-950 shadow-xl' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
              <span className="material-symbols-outlined block mb-1 mx-auto text-xl">calendar_month</span>
              Wellness Calendar
            </button>
          </div>
        </div>
      </section>

      {/* Calendar Strip — only for calendar tab */}
      {activeTab === 'calendar' && (
        <section className="mb-8">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 px-1">
            {getDaysStrip().map((date, i) => {
              const isSel = date.toDateString() === selectedDate.toDateString();
              const isToday = date.toDateString() === new Date().toDateString();
              const dateKey = date.toISOString().split('T')[0];
              const hasDone = weekTicks[dateKey] && Object.values(weekTicks[dateKey]).some(v => v);
              return (
                <button key={i} onClick={() => setSelectedDate(date)}
                  className={`min-w-[90px] p-4 rounded-[2rem] border transition-all flex flex-col items-center gap-1 ${isSel ? 'bg-slate-950 border-slate-950 text-white shadow-2xl scale-110 z-10' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                  <span className="text-[9px] font-black uppercase tracking-[0.3em]">{date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-2xl font-black tracking-tighter">{date.getDate()}</span>
                  <span className={`w-2 h-2 rounded-full ${hasDone ? 'bg-emerald-400' : isToday && !isSel ? 'bg-blue-500' : 'bg-transparent'}`} />
                </button>
              );
            })}
          </div>
        </section>
      )}

      <AnimatePresence mode="wait">

        {/* ── TAB 1: DIET PLANNER ──────────────────────────────────────────── */}
        {activeTab === 'diet' && (
          <motion.div key="diet" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            <div className="lg:col-span-1 space-y-8">
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-emerald-600">payments</span>
                  <h3 className="text-lg font-black text-slate-950 tracking-tight">Daily Budget</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">₹ per day</span>
                    <span className="text-3xl font-black text-slate-950">₹{budget}</span>
                  </div>
                  <input type="range" min="50" max="300" step="10" value={budget} onChange={e => setBudget(Number(e.target.value))} className="w-full accent-blue-600" />
                  <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase">
                    <span>₹50</span><span>₹150</span><span>₹300</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[80, 120, 200].map(v => (
                      <button key={v} onClick={() => setBudget(v)}
                        className={`py-3 rounded-2xl text-[10px] font-black border transition-all ${budget === v ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-400 hover:border-blue-300'}`}>
                        ₹{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={generateDietPlan} disabled={isGeneratingDiet || !selectedIngredients.length}
                className="w-full py-6 bg-slate-950 text-white rounded-3xl font-black text-[11px] uppercase tracking-[0.4em] shadow-xl disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                {isGeneratingDiet
                  ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Generating...</>
                  : <><span className="material-symbols-outlined">auto_awesome</span>Generate 7-Day Plan</>}
              </button>
              {!selectedIngredients.length && <p className="text-[10px] text-slate-400 font-medium text-center -mt-4">Select ingredients below first</p>}
            </div>

            <div className="lg:col-span-2">
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-950 tracking-tight">What's in your kitchen?</h3>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedIngredients.length} selected</span>
                </div>
                <p className="text-sm text-slate-500 font-medium mb-6">Select what you actually have at home right now.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INGREDIENTS.map(ing => {
                    const checked = selectedIngredients.includes(ing);
                    return (
                      <button key={ing} onClick={() => toggleIngredient(ing)}
                        className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${checked ? 'border-blue-600 bg-blue-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                          {checked && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                        </div>
                        <span className={`text-sm font-bold ${checked ? 'text-blue-700' : 'text-slate-600'}`}>{ing}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB 2: WELLNESS CALENDAR ─────────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <motion.div key="calendar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ── MAIN COLUMN ── */}
            <div className="lg:col-span-8 space-y-6">

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Streak</p>
                  <p className="text-3xl font-black text-slate-950 tracking-tighter">{streak}</p>
                  <p className="text-[10px] text-slate-400 font-medium">days</p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Today</p>
                  <p className="text-3xl font-black text-slate-950 tracking-tighter">{doneTodayCount}/{totalToday}</p>
                  <p className="text-[10px] text-slate-400 font-medium">done</p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 mb-1">Water</p>
                  <p className="text-3xl font-black text-blue-600 tracking-tighter">{dailyLog?.water_intake || 0}</p>
                  <p className="text-[10px] text-slate-400 font-medium">litres</p>
                </div>
              </div>

              {/* Week overview */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">This Week</p>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((label, i) => {
                    const date = weekDates[i];
                    const done = getDayCompletion(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    const isFuture = date > new Date();
                    return (
                      <button key={i} onClick={() => !isFuture && setSelectedDate(date)}
                        className={`flex flex-col items-center gap-2 py-3 rounded-2xl border-2 transition-all ${isToday ? 'border-blue-600 bg-blue-50' : 'border-slate-100'} ${isFuture ? 'opacity-30 cursor-default' : 'hover:border-slate-200 cursor-pointer'}`}>
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span>
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center ${done ? 'bg-emerald-500' : isToday ? 'bg-blue-100' : 'bg-slate-100'}`}>
                          {done
                            ? <span className="material-symbols-outlined text-white text-[14px]">check</span>
                            : <span className="text-[11px] font-black text-slate-400">{date.getDate()}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan banner */}
              <div className={`rounded-3xl p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${wellnessPlan ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex-1">
                  {wellnessPlan ? (
                    <>
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">{wellnessPlan.planType}</p>
                      <p className="text-sm font-bold text-blue-900 mt-1">{wellnessPlan.weeklyGoal}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">No plan yet</p>
                      <p className="text-sm font-bold text-slate-700 mt-1">Generate a personalised plan based on your health profile and conditions.</p>
                    </>
                  )}
                </div>
                <button onClick={generateWellnessPlan} disabled={isGeneratingPlan}
                  className="flex-shrink-0 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-2">
                  {isGeneratingPlan
                    ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <span className="material-symbols-outlined text-sm">auto_awesome</span>}
                  {wellnessPlan ? 'Replan' : 'Generate Plan'}
                </button>
              </div>

              {/* Today's date heading */}
              <div>
                <h2 className="text-2xl font-black text-slate-950 tracking-tighter">
                  {selectedDate.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h2>
                {totalToday > 0 && (
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span>Progress</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.5 }}
                        className={`h-full rounded-full ${progressPct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Activities */}
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-slate-950 tracking-tight">Activities</h3>
                  {doneTodayCount === totalToday && totalToday > 0 && (
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">verified</span> All done!
                    </span>
                  )}
                </div>
                {todayActivities.map((activity, idx) => {
                  const tickKey = `${dayName}_${activity.name}`;
                  const done = !!activityTicks[tickKey];
                  const isExpanded = expandedActivity === idx;
                  return (
                    <div key={idx} className={`rounded-2xl border-2 transition-all ${done ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100 bg-white'}`}>
                      <div className="flex items-center gap-4 p-4">
                        <button onClick={() => toggleActivityTick(activity)}
                          className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-blue-400'}`}>
                          {done && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`font-black text-sm ${done ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>{activity.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-400">{activity.duration} min</span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${INTENSITY_STYLE[activity.intensity] || 'bg-slate-100 text-slate-500'}`}>
                              {activity.intensity}
                            </span>
                          </div>
                        </div>
                        <button onClick={() => setExpandedActivity(isExpanded ? null : idx)}
                          className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-all flex-shrink-0">
                          <span className="material-symbols-outlined text-slate-400 text-[16px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                        </button>
                      </div>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden px-4 pb-4">
                            <p className="text-sm text-slate-600 font-medium leading-relaxed border-t border-slate-100 pt-3">
                              {activity.instructions}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* AI Diet Tips (from wellness plan) */}
              {wellnessPlan?.dietSuggestions?.length > 0 && (
                <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="material-symbols-outlined text-emerald-600">restaurant_menu</span>
                    <h3 className="text-lg font-black text-slate-950 tracking-tight">AI Diet Tips</h3>
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-3 py-1 rounded-full">Personalised</span>
                  </div>
                  <div className="space-y-3">
                    {wellnessPlan.dietSuggestions.map((tip, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <span className="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">{i + 1}</span>
                        <p className="text-sm font-medium text-emerald-900 leading-relaxed">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medicine Reminders */}
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="material-symbols-outlined text-blue-600">medication</span>
                  <h3 className="text-lg font-black text-slate-950 tracking-tight">Medicine Reminders</h3>
                  {medicineList.length > 0 && (
                    <span className="text-[10px] font-black text-slate-400">{medicineList.filter(m => m.taken).length}/{medicineList.length} taken</span>
                  )}
                </div>

                {/* Add form */}
                <div className="space-y-3">
                  <input type="text" value={newMedicine} onChange={e => setNewMedicine(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addMedicine()}
                    placeholder="Medicine name (e.g. Metformin 500mg)"
                    className="w-full border border-slate-200 rounded-2xl px-5 py-3 text-sm font-medium focus:outline-none focus:border-blue-400" />
                  <div className="flex gap-2 flex-wrap">
                    {MED_TIMES.map(t => (
                      <button key={t} onClick={() => setNewMedTime(t)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black border transition-all ${newMedTime === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-400 hover:border-blue-300'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <button onClick={addMedicine}
                    className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                    Add Medicine
                  </button>
                </div>

                {medicineList.length === 0 ? (
                  <p className="text-slate-400 text-sm font-medium text-center py-4">No medicines added. Add doctor-prescribed medicines above.</p>
                ) : (
                  <div className="space-y-3">
                    {medicineList.map((med, idx) => (
                      <div key={idx} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${med.taken ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100'}`}>
                        <button onClick={() => toggleMedicineTaken(idx)}
                          className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center flex-shrink-0 transition-all ${med.taken ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'}`}>
                          {med.taken && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                        </button>
                        <div className="flex-1">
                          <p className={`font-black text-sm ${med.taken ? 'text-emerald-700 line-through' : 'text-slate-900'}`}>{med.name}</p>
                          <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 ${medTimeColors[med.time] || 'bg-slate-100 text-slate-500'}`}>
                            {med.time}
                          </span>
                        </div>
                        <button onClick={() => removeMedicine(idx)}
                          className="w-8 h-8 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── SIDEBAR ── */}
            <aside className="lg:col-span-4 space-y-6">

              {/* Daily Log */}
              <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">analytics</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-950 tracking-tighter">Daily Log</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Track Today</p>
                  </div>
                </div>

                {/* Water */}
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hydration</p>
                    <p className="text-xl font-black text-blue-600">{dailyLog?.water_intake || 0}L <span className="text-slate-300 font-medium text-sm">/ 2.5L</span></p>
                  </div>
                  <div className="h-4 bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(((dailyLog?.water_intake || 0) / 2.5) * 100, 100)}%` }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateLog({ water_intake: Math.max(0, (dailyLog?.water_intake || 0) - 0.25) })}
                      className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-400 font-black text-[10px] flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
                      <span className="material-symbols-outlined text-sm">remove</span>
                    </button>
                    <button onClick={() => updateLog({ water_intake: (dailyLog?.water_intake || 0) + 0.25 })}
                      className="flex-[3] py-4 rounded-2xl bg-blue-50 text-blue-600 font-black text-[10px] flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all">
                      <span className="material-symbols-outlined text-sm">add</span>+250ml
                    </button>
                  </div>
                </div>

                {/* Vitamins */}
                <button onClick={() => updateLog({ vitamin_taken: !dailyLog?.vitamin_taken })}
                  className={`w-full p-6 rounded-[2.5rem] border-2 transition-all flex items-center justify-between ${dailyLog?.vitamin_taken ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
                  <div className="flex items-center gap-5">
                    <span className={`material-symbols-outlined text-3xl ${dailyLog?.vitamin_taken ? 'text-emerald-600' : 'text-slate-200'}`}>medication</span>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Supplements</p>
                      <p className="text-base font-black text-slate-950">{dailyLog?.vitamin_taken ? 'Taken ✓' : 'Pending'}</p>
                    </div>
                  </div>
                  {dailyLog?.vitamin_taken && <span className="material-symbols-outlined text-emerald-600">verified</span>}
                </button>
              </div>

              {/* Wellness Tip / plan summary */}
              <div className="bg-slate-950 rounded-[3rem] p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-[80px]" />
                <span className="material-symbols-outlined text-4xl text-blue-500 mb-4 opacity-60">tips_and_updates</span>
                <h4 className="text-xl font-black tracking-tight mb-3">
                  {streak >= 3 ? `${streak}-day streak!` : 'Wellness Tip'}
                </h4>
                <p className="text-slate-400 font-medium text-sm leading-relaxed">
                  {streak >= 7
                    ? 'Incredible — a full week! Consistency is the hardest part of any health habit. Keep going.'
                    : streak >= 3
                    ? 'You are building a real habit. Three or more consecutive days is where it starts to stick.'
                    : doneTodayCount === totalToday && totalToday > 0
                    ? 'All activities done for today. Log your water and supplements to complete the day.'
                    : 'Drink water before each activity. Even 5 minutes of movement is better than none.'}
                </p>
              </div>

              {/* Full 7-day plan preview */}
              {wellnessPlan?.days && (
                <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">7-Day Plan</p>
                  <div className="space-y-3">
                    {wellnessPlan.days.map((d, i) => {
                      const isSelectedDay = d.day === dayName;
                      return (
                        <button key={i} onClick={() => {
                          const target = weekDates.find(wd => wd.toLocaleDateString('en-US', { weekday: 'long' }) === d.day);
                          if (target) setSelectedDate(target);
                        }}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left ${isSelectedDay ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'}`}>
                          <span className={`text-sm font-black ${isSelectedDay ? 'text-blue-700' : 'text-slate-700'}`}>{d.day}</span>
                          <span className="text-[10px] font-bold text-slate-400">{d.activities?.length || 0} activities</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Diet Plan Modal */}
      <AnimatePresence>
        {showDietModal && dietPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-950/40 backdrop-blur-md">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-slate-950">Your 7-Day Diet Plan</h2>
                  <p className="text-slate-400 font-medium text-sm mt-1">₹{dietPlan.totalDailyBudget}/day · {selectedIngredients.length} ingredients used</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={downloadDietPlanPDF}
                    className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                    <span className="material-symbols-outlined text-sm">download</span>
                    Download PDF
                  </button>
                  <button onClick={() => setShowDietModal(false)}
                    className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all">
                    <span className="material-symbols-outlined text-slate-600">close</span>
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {dietPlan.nutritionNotes && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Nutrition Note</p>
                    <p className="text-sm font-medium text-blue-800">{dietPlan.nutritionNotes}</p>
                  </div>
                )}
                {dietPlan.days?.map((day, dIdx) => (
                  <div key={dIdx} className="space-y-4">
                    <h3 className="text-xl font-black text-slate-950 tracking-tight border-b border-slate-100 pb-3">{day.day}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {day.meals?.map((meal, mIdx) => (
                        <div key={mIdx} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${meal.type === 'Breakfast' ? 'bg-amber-100 text-amber-700' : meal.type === 'Lunch' ? 'bg-blue-100 text-blue-700' : meal.type === 'Dinner' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                              {meal.type}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400">
                              <span>{meal.calories} kcal</span>
                              {meal.cost && <span className="text-emerald-600">· ₹{meal.cost}</span>}
                            </div>
                          </div>
                          <p className="font-black text-slate-900">{meal.name}</p>
                          <p className="text-slate-500 text-xs font-medium mt-1 leading-relaxed">{meal.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
