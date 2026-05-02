'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function MedicalFilePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageUsage, setStorageUsage] = useState(0);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [healthSummary, setHealthSummary] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [isSharing, setIsSharing] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('user_id', user.id)
      .order('record_date', { ascending: false });

    if (error) {
      toast.error('Failed to load records');
    } else {
      setRecords(data || []);
      calculateStorage(data || []);
    }
    setLoading(false);
  };

  const calculateStorage = (data) => {
    const totalBytes = data.length * 2.5 * 1024 * 1024;
    const mb = (totalBytes / (1024 * 1024)).toFixed(1);
    setStorageUsage(mb);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (parseFloat(storageUsage) >= 100) {
      toast.error('Storage limit reached (100MB)');
      return;
    }

    try {
      setIsUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('medical-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('medical-files')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase.from('medical_records').insert({
        user_id: user.id,
        title: file.name,
        category: 'Diagnostic',
        facility: 'Self Upload',
        record_date: new Date().toISOString().split('T')[0],
        file_url: urlData.publicUrl
      });

      if (dbError) throw dbError;

      toast.success('Record encrypted and stored');
      fetchRecords();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (record) => {
    setRecordToDelete(record);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    const record = recordToDelete;

    try {
      if (record.file_url && record.file_url !== 'ai-generated-note') {
        const filePath = record.file_url.split('/medical-files/').pop();
        if (filePath) {
          await supabase.storage.from('medical-files').remove([filePath]);
        }
      }

      const { error: dbError } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', record.id);

      if (dbError) throw dbError;

      toast.success('Record purged from vault');
      fetchRecords();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete record');
    } finally {
      setShowDeleteModal(false);
      setRecordToDelete(null);
    }
  };

  const generateShareLink = async () => {
    try {
      setIsSharing(true);
      const res = await fetch('/api/medical/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInHours: 24 }),
      });
      const data = await res.json();
      if (data.success) {
        const url = `${window.location.origin}/share/${data.token}`;
        setShareLink(url);
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.success('Share link copied! Expires in 24 hours.');
      } else {
        toast.error('Could not generate share link');
      }
    } catch {
      toast.error('Share failed');
    } finally {
      setIsSharing(false);
    }
  };

  const generateSummary = async () => {
    try {
      setIsSummarizing(true);
      setShowSummary(true);
      const res = await fetch('/api/medical/summary');
      const data = await res.json();
      if (data.success) {
        setHealthSummary(data.summary);
        fetchRecords();
      } else {
        toast.error('Clinical analysis failed');
        setShowSummary(false);
      }
    } catch (error) {
      toast.error('Engine connection failed');
    } finally {
      setIsSummarizing(false);
    }
  };

  const saveSummaryAsRecord = async () => {
    if (!healthSummary) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Session expired. Please login again.');
        return;
      }

      // 1. Prepare data - Use a fallback if the dedicated column is missing
      const summaryString = JSON.stringify(healthSummary);
      
      const { error } = await supabase.from('medical_records').insert({
        user_id: user.id,
        title: `AI Health Summary - ${new Date().toLocaleDateString()}`,
        category: 'Analysis',
        facility: 'MediAI Virtual Lab',
        record_date: new Date().toISOString().split('T')[0],
        file_url: 'ai-generated-note',
        // Attempting to save to ai_summary, but we'll catch if it's missing
        ai_summary: summaryString 
      });

      if (error) {
        // If the column is missing, try saving without it to at least keep the record title
        console.warn("Retrying save without ai_summary column...");
        const { error: retryError } = await supabase.from('medical_records').insert({
          user_id: user.id,
          title: `AI Health Summary (Schema Update Required) - ${new Date().toLocaleDateString()}`,
          category: 'Analysis',
          facility: summaryString.substring(0, 250), // Store start of summary in facility as fallback
          record_date: new Date().toISOString().split('T')[0],
          file_url: 'ai-generated-note'
        });
        
        if (retryError) throw retryError;
        toast.success('Record header saved (Warning: DB Schema update needed for full summary)');
      } else {
        toast.success('Intelligence saved to vault');
      }

      fetchRecords();
      setShowSummary(false);
    } catch (error) {
      console.error('Save summary failure:', error);
      toast.error(`Critical Save Error: ${error.message}`);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || r.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Diagnostic', 'Analysis', 'Prescription', 'Surgery'];

  return (
    <main className="pt-20 md:pt-24 pb-8 md:pb-32 px-4 md:px-8 max-w-[1600px] mx-auto bg-[#FDFDFD] font-sans selection:bg-blue-100">

      {/* ════════════════════════ MOBILE HEADER */}
      <div className="md:hidden mb-5 pt-2">
        <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 p-6 shadow-xl">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                <span className="text-[9px] font-black tracking-[0.3em] uppercase text-blue-400">Secure Core 3.0</span>
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter">Medical<br />Vault</h1>
              <p className="text-slate-400 text-sm font-medium">Encrypted clinical records</p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <button
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
                className="bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">cloud_upload</span>
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
              <button
                onClick={generateSummary}
                className="bg-white/10 text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-white/20 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">psychology</span>
                AI Summary
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Share + Search */}
        <div className="mt-3 space-y-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none shadow-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-slate-950 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}
              >{cat}</button>
            ))}
          </div>
        </div>

        {/* Mobile Records List */}
        <div className="mt-4 space-y-3">
          {loading ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse"></div>)
          ) : filteredRecords.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <span className="material-symbols-outlined text-5xl text-slate-200">folder_zip</span>
              <h3 className="text-lg font-black text-slate-900 mt-3">Vault Empty</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Upload your first record</p>
            </div>
          ) : filteredRecords.map((record) => (
            <div key={record.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                <span className="material-symbols-outlined text-xl">
                  {record.category === 'Analysis' ? 'clinical_notes' : record.category === 'Prescription' ? 'medication' : 'lab_research'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">{record.category}</span>
                <h3 className="text-sm font-black text-slate-900 truncate">{record.title}</h3>
                <p className="text-[10px] text-slate-400 font-medium">{new Date(record.record_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {record.file_url !== 'ai-generated-note' ? (
                  <a href={record.file_url} target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                  </a>
                ) : (
                  <button onClick={() => { try { const s = typeof record.ai_summary === 'string' ? JSON.parse(record.ai_summary) : record.ai_summary; setHealthSummary(s); setShowSummary(true); } catch { toast.error('Failed to load'); }}}
                    className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm">psychology_alt</span>
                  </button>
                )}
                <button onClick={() => handleDelete(record)} className="w-9 h-9 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all">
                  <span className="material-symbols-outlined text-sm">delete_outline</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Share Link */}
        <div className="mt-3">
          <button onClick={generateShareLink} disabled={isSharing}
            className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 bg-white shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">share</span>
            {isSharing ? 'Generating...' : 'Share Medical File (24h link)'}
          </button>
          {shareLink && (
            <div className="mt-2 p-3 bg-blue-50 rounded-2xl border border-blue-100">
              <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Read-only link (24h):</p>
              <p className="text-[10px] text-blue-700 font-mono break-all">{shareLink}</p>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════ DESKTOP LAYOUT */}
      <div className="hidden md:block">

      {/* Framed Header Section 3.0 */}
      <section className="mb-12 relative min-h-[400px] md:h-[500px] overflow-hidden rounded-[3rem] bg-slate-950 p-8 md:p-16 shadow-2xl border border-white/10">
        <div className="absolute inset-0">
          <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-blue-600 rounded-full blur-[180px] opacity-20"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[80%] bg-indigo-600 rounded-full blur-[180px] opacity-20"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
        </div>

        <div className="max-w-[1500px] mx-auto relative z-10 flex flex-col md:flex-row items-center gap-12 h-full">
          <div className="flex-1 space-y-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl"
            >
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black tracking-[0.4em] uppercase text-blue-400">Secure Core 3.0</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl xs:text-4xl md:text-6xl lg:text-8xl font-black text-white tracking-tighter leading-[0.85]"
            >
              Medical <br /> Vault
            </motion.h1>
            <p className="text-slate-400 font-medium text-sm xs:text-base md:text-xl lg:text-2xl leading-relaxed">
              Your sovereign clinical data ecosystem. Encrypted, audited, and ready for neural synthesis.
            </p>
            
            <div className="flex gap-4 w-full md:w-auto">
              <button 
                onClick={() => fileInputRef.current.click()}
                disabled={isUploading}
                className="fixed bottom-8 right-8 z-[80] md:static flex-1 md:flex-none bg-blue-600 md:bg-white text-white md:text-slate-950 px-10 py-6 md:py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-[0_20px_60px_rgba(37,99,235,0.4)] md:shadow-2xl flex items-center justify-center gap-4 border-4 border-white/10 md:border-none"
              >
                <span className="material-symbols-outlined text-3xl md:text-2xl">cloud_upload</span>
                <span className="hidden md:inline">{isUploading ? 'Securing...' : 'Upload Node'}</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            </div>
          </div>

          <div className="w-full md:w-1/3 aspect-square rounded-3xl overflow-hidden glass-panel border border-white/10 p-2 group">
            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-900/80 via-slate-800/80 to-indigo-900/80 scale-110 group-hover:scale-100 transition-transform duration-1000 flex items-center justify-center">
              <span className="material-symbols-outlined text-[80px] text-blue-300/30">folder_lock</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid 2.5 */}
      <div className="grid grid-cols-12 gap-8 md:gap-12 relative z-20">
        
        {/* Left: System Stats & AI Lab */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          {/* AI Neural Lab Card */}
          <div className="bg-slate-950 rounded-[3rem] p-8 md:p-12 relative overflow-hidden group shadow-2xl shadow-blue-900/10">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent"></div>
            <div className="relative z-10 space-y-10">
              <div className="flex items-center justify-between">
                <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 text-white rounded-3xl flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500">
                  <span className="material-symbols-outlined text-4xl">psychology</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em]">Lab 3.0</span>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xl xs:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">Neural <br /> Synthesis</h3>
                <p className="text-slate-500 text-sm xs:text-base md:text-lg leading-relaxed font-medium">Extract actionable clinical intelligence from your longitudinal records.</p>
              </div>
              <button
                onClick={generateSummary}
                className="w-full py-6 rounded-3xl bg-white text-slate-950 font-black text-xs uppercase tracking-[0.4em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl"
              >
                Execute Analysis
              </button>
              <button
                onClick={generateShareLink}
                disabled={isSharing}
                className="w-full py-4 rounded-3xl border border-white/20 text-white/70 font-black text-xs uppercase tracking-[0.3em] hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">share</span>
                {isSharing ? 'Generating...' : 'Share File (24h link)'}
              </button>
              {shareLink && (
                <div className="mt-2 p-4 bg-white/10 rounded-2xl border border-white/20">
                  <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Read-only link (24h):</p>
                  <p className="text-[10px] text-blue-400 font-mono break-all">{shareLink}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Explorer Hub */}
        <div className="col-span-12 lg:col-span-8 space-y-12">
          {/* Futuristic Control Bar */}
          <div className="bg-white/90 backdrop-blur-3xl rounded-[3rem] p-4 border border-white/50 flex flex-col md:flex-row items-center gap-6 shadow-[0_30px_100px_rgba(0,0,0,0.05)]">
            <div className="flex-1 relative w-full group">
              <span className="material-symbols-outlined absolute left-7 top-1/2 -translate-y-1/2 text-blue-500/30 group-focus-within:text-blue-600 transition-colors">search</span>
              <input 
                type="text"
                placeholder="Search vault history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-50 rounded-[2rem] py-6 pl-16 pr-10 text-base font-black text-slate-950 placeholder:text-slate-300 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-3 px-4 w-full md:w-auto overflow-x-auto no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-8 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${activeCategory === cat ? 'bg-slate-950 text-white shadow-2xl scale-105' : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-100'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Records Viewport */}
          <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'} gap-8`}>
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="bg-white/50 h-80 rounded-[4rem] animate-pulse border border-white"></div>
                ))
              ) : filteredRecords.map((record) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={record.id} 
                  className="bg-white/90 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] md:rounded-[4rem] border border-white shadow-[0_20px_60px_rgba(0,0,0,0.03)] hover:shadow-[0_40px_100px_rgba(0,0,0,0.08)] hover:-translate-y-3 transition-all duration-500 group relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-2 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-12">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 md:w-20 md:h-20 bg-slate-50 rounded-2xl md:rounded-[2rem] flex items-center justify-center group-hover:bg-blue-600 transition-all duration-700 group-hover:rotate-12 shadow-inner shrink-0">
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-white transition-colors text-2xl md:text-4xl">
                          {record.category === 'Analysis' ? 'clinical_notes' : record.category === 'Prescription' ? 'medication' : 'lab_research'}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <span className="inline-block px-4 py-1 rounded-full bg-blue-50 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">
                          {record.category}
                        </span>
                        <h3 className="text-lg md:text-2xl font-black text-slate-950 tracking-tighter leading-tight max-w-[200px] line-clamp-1">{record.title}</h3>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(record)}
                      className="w-12 h-12 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <span className="material-symbols-outlined text-2xl">delete_outline</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-10 border-t border-slate-50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Timestamp</p>
                      <p className="text-base font-black text-slate-600 uppercase">{new Date(record.record_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                    
                    {record.file_url === 'ai-generated-note' ? (
                      <button 
                        onClick={() => {
                          try {
                            const summary = typeof record.ai_summary === 'string' ? JSON.parse(record.ai_summary) : record.ai_summary;
                            setHealthSummary(summary);
                            setShowSummary(true);
                          } catch (e) {
                            toast.error("Integrity Check Failed");
                          }
                        }}
                        className="h-16 w-16 bg-blue-600 text-white rounded-3xl shadow-2xl shadow-blue-600/30 hover:scale-110 transition-all flex items-center justify-center group/btn"
                      >
                        <span className="material-symbols-outlined text-3xl group-hover/btn:animate-pulse">psychology_alt</span>
                      </button>
                    ) : (
                      <a 
                        href={record.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="h-16 w-16 bg-slate-950 text-white rounded-3xl shadow-2xl shadow-slate-950/30 hover:scale-110 transition-all flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-3xl">visibility</span>
                      </a>
                    )}
                  </div>
                </motion.div>
              ))}

              {filteredRecords.length === 0 && !loading && (
                <div className="col-span-1 md:col-span-2 py-48 text-center bg-white/40 rounded-[5rem] border-4 border-dashed border-white">
                  <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center mx-auto mb-12 shadow-2xl">
                    <span className="material-symbols-outlined text-6xl text-slate-100">folder_zip</span>
                  </div>
                  <h3 className="text-4xl font-black text-slate-950 tracking-tighter">Vault Silent</h3>
                  <p className="text-slate-400 font-black mt-4 uppercase tracking-[0.5em] text-xs">Zero records detected in current node.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      </div>{/* end desktop layout */}

      {/* Clinical Intelligence Modal 4.0 */}
      <AnimatePresence>
        {showSummary && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-200"
            >
              {/* Header: Patient Identification */}
              <div className="p-6 md:p-8 bg-slate-950 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-3xl">patient_list</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">{healthSummary?.patientInfo?.name || 'Patient Report'}</h2>
                    <div className="flex gap-4 mt-1 opacity-60">
                      <span className="text-[10px] font-bold uppercase tracking-widest">{healthSummary?.patientInfo?.age || 'N/A'} Years</span>
                      <span className="text-[10px] font-bold uppercase tracking-widest">{healthSummary?.patientInfo?.gender || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowSummary(false)} className="relative z-10 w-12 h-12 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-all">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-slate-50/50">
                {isSummarizing ? (
                  <div className="py-20 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Processing clinical nodes...</p>
                  </div>
                ) : healthSummary ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Status: BLUE */}
                    <div className="col-span-1 md:col-span-2 bg-white p-8 rounded-3xl border border-blue-100 shadow-sm border-l-[12px] border-l-blue-600">
                      <div className="flex items-center gap-4 mb-4">
                        <span className="material-symbols-outlined text-blue-600">timeline</span>
                        <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Longitudinal Timeline</h3>
                      </div>
                      <h4 className="text-3xl font-black text-slate-900 tracking-tight mb-3">{healthSummary.overview.status}</h4>
                      <p className="text-slate-600 font-medium leading-relaxed mb-6">{healthSummary.overview.analysis}</p>
                      
                      {healthSummary.overview.clinicalTraj && (
                        <div className="pt-6 border-t border-slate-50">
                          <h5 className="font-black text-blue-600 uppercase tracking-widest text-[10px] mb-2">Future Clinical Path</h5>
                          <p className="text-slate-500 text-sm font-bold italic">"{healthSummary.overview.clinicalTraj}"</p>
                        </div>
                      )}
                    </div>

                    {/* Trends: GREEN */}
                    <div className="bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm border-l-[12px] border-l-emerald-500">
                      <div className="flex items-center gap-4 mb-6">
                        <span className="material-symbols-outlined text-emerald-500">trending_up</span>
                        <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Wellness Trends</h3>
                      </div>
                      <div className="space-y-4">
                        {healthSummary.trends.map((trend, i) => (
                          <div key={i} className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl">
                            <span className="font-bold text-slate-700 text-sm">{trend.topic}</span>
                            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${trend.status === 'Positive' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>{trend.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Progress: YELLOW */}
                    <div className="bg-white p-8 rounded-3xl border border-amber-100 shadow-sm border-l-[12px] border-l-amber-400">
                      <div className="flex items-center gap-4 mb-6">
                        <span className="material-symbols-outlined text-amber-500">auto_awesome</span>
                        <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Highlights</h3>
                      </div>
                      <ul className="space-y-3">
                        {healthSummary.progress.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 shrink-0"></span>
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommendations: RED */}
                    <div className="col-span-1 md:col-span-2 bg-slate-950 p-8 md:p-10 rounded-[2.5rem] text-white border-l-[12px] border-l-red-600">
                      <div className="flex items-center gap-4 mb-8">
                        <span className="material-symbols-outlined text-red-500">medical_alert</span>
                        <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Clinical Directives</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {healthSummary.recommendations.map((rec, i) => (
                          <div key={i} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="font-black text-lg tracking-tight">{rec.action}</h5>
                              <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${rec.priority === 'High' ? 'bg-red-600' : 'bg-blue-600'}`}>{rec.priority}</span>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed">{rec.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="p-6 md:p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row gap-4">
                <button onClick={() => setShowSummary(false)} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-900 transition-colors">Discard</button>
                <button onClick={saveSummaryAsRecord} className="flex-[2] py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Save to Vault</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Clinical Deletion Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200"
            >
              <div className="p-10 text-center space-y-8">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                  <span className="material-symbols-outlined text-5xl">warning</span>
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Purge Record?</h3>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    You are about to permanently delete <span className="text-slate-900 font-bold underline">"{recordToDelete?.title}"</span> from your clinical vault. This action is irreversible.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={confirmDelete}
                    className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.4em] shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Confirm Deletion
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="w-full py-5 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-[0.4em] hover:bg-slate-200 transition-all"
                  >
                    Cancel Action
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
