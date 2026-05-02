"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ── Timestamp helper ──────────────────────────────────────────────────────────
const nowTime = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

// ── Inline bold/italic parser ─────────────────────────────────────────────────
function inlineParse(text) {
  if (!text) return text;
  if (!text.includes('**') && !text.includes('*')) return text;
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

// ── Markdown → JSX renderer ───────────────────────────────────────────────────
function renderMessage(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let inList = false;
  let listItems = [];

  const flushList = (key) => {
    if (listItems.length) {
      elements.push(<ul key={`ul-${key}`} className="space-y-1 my-1">{listItems}</ul>);
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      flushList(i);
      elements.push(
        <p key={i} className="font-black text-[13px] mt-3 mb-1 pb-1 border-b border-current/10">
          {inlineParse(line.replace(/^##\s+/, ''))}
        </p>
      );
    } else if (line.startsWith('### ')) {
      flushList(i);
      elements.push(
        <p key={i} className="font-bold text-sm mt-2 mb-0.5">
          {inlineParse(line.replace(/^###\s+/, ''))}
        </p>
      );
    } else if (/^[-•]\s/.test(line)) {
      inList = true;
      listItems.push(
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
          <span className="mt-1 opacity-40 flex-shrink-0">•</span>
          <span>{inlineParse(line.replace(/^[-•]\s+/, ''))}</span>
        </li>
      );
    } else if (/^\d+\.\s/.test(line)) {
      inList = true;
      const num = line.match(/^(\d+)\./)[1];
      listItems.push(
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed">
          <span className="font-black opacity-50 flex-shrink-0 w-4">{num}.</span>
          <span>{inlineParse(line.replace(/^\d+\.\s+/, ''))}</span>
        </li>
      );
    } else if (line.trim() === '') {
      flushList(i);
      elements.push(<div key={i} className="h-2" />);
    } else {
      flushList(i);
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {inlineParse(line)}
        </p>
      );
    }
  });
  flushList('end');
  return <div className="space-y-0.5">{elements}</div>;
}

// ── Report Analysis Card ──────────────────────────────────────────────────────
const SECTION_CONFIG = {
  'patient info':              { bg: 'bg-slate-50',   border: 'border-slate-200',  title: 'text-slate-600',   icon: '👤' },
  'diagnosis':                 { bg: 'bg-blue-50',    border: 'border-blue-200',   title: 'text-blue-700',    icon: '🩺' },
  'test results':              { bg: 'bg-white',      border: 'border-slate-200',  title: 'text-slate-700',   icon: '🧪' },
  'medicines prescribed':      { bg: 'bg-purple-50',  border: 'border-purple-200', title: 'text-purple-700',  icon: '💊' },
  'normal values summary':     { bg: 'bg-emerald-50', border: 'border-emerald-200',title: 'text-emerald-700', icon: '✅' },
  'values needing attention':  { bg: 'bg-amber-50',   border: 'border-amber-200',  title: 'text-amber-700',   icon: '⚠️' },
  'urgent red flags':          { bg: 'bg-red-50',     border: 'border-red-300',    title: 'text-red-700',     icon: '🚨' },
  "doctor's advice":           { bg: 'bg-indigo-50',  border: 'border-indigo-200', title: 'text-indigo-700',  icon: '👨‍⚕️' },
  'simple summary':            { bg: 'bg-sky-50',     border: 'border-sky-200',    title: 'text-sky-700',     icon: '📋' },
};

function getSectionConfig(title) {
  const lower = title.toLowerCase().replace(/[⚠️🚨]/g, '').trim();
  for (const [key, cfg] of Object.entries(SECTION_CONFIG)) {
    if (lower.includes(key)) return cfg;
  }
  return { bg: 'bg-slate-50', border: 'border-slate-200', title: 'text-slate-600', icon: '📄' };
}

function ReportAnalysisCard({ text }) {
  const [expanded, setExpanded] = useState(null);

  // Parse ## sections
  const sections = [];
  const lines = text.split('\n');
  let current = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.replace(/^##\s+/, '').trim(), lines: [] };
    } else if (current && line.trim()) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);

  // Fallback if AI didn't use ## sections
  if (sections.length === 0) return <div>{renderMessage(text)}</div>;

  const isUrgentSection = (title) =>
    title.toLowerCase().includes('urgent') || title.toLowerCase().includes('red flag');
  const isAbnormalSection = (title) =>
    title.toLowerCase().includes('attention') || title.toLowerCase().includes('abnormal');

  return (
    <div className="space-y-2 w-full">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <span className="text-xl">📋</span>
        <div>
          <p className="font-black text-slate-900 tracking-tight">Report Analysis</p>
          <p className="text-[10px] text-slate-400 font-medium">Tap any section to expand</p>
        </div>
      </div>

      {sections.map((section, i) => {
        const cfg = getSectionConfig(section.title);
        const isUrgent = isUrgentSection(section.title);
        const contentStr = section.lines.join(' ').toLowerCase().trim();
        const isEmpty = !contentStr || contentStr === 'no urgent values found'
          || contentStr === 'no medicines prescribed' || contentStr === 'no specific advice mentioned';
        if (isEmpty && !isUrgent) return null;

        const isOpen = expanded === i;

        return (
          <div key={i} className={`${cfg.bg} border ${cfg.border} rounded-2xl overflow-hidden ${isUrgent ? 'border-2' : ''}`}>
            <button
              className="w-full flex items-center gap-3 p-3 text-left"
              onClick={() => setExpanded(isOpen ? null : i)}
            >
              <span className="text-base flex-shrink-0">{cfg.icon}</span>
              <p className={`text-[11px] font-black uppercase tracking-wider flex-1 ${cfg.title}`}>
                {section.title}
              </p>
              {isUrgent && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />}
              <span className={`material-symbols-outlined text-[16px] text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-1 space-y-1.5 border-t border-current/10">
                    {section.lines.map((line, j) => {
                      const isNormalLine = line.toLowerCase().includes('(normal)');
                      const isAbnormalLine = line.toLowerCase().includes('(abnormal)')
                        || line.toLowerCase().includes('(high)')
                        || line.toLowerCase().includes('(low)');

                      if (/^[-•]\s/.test(line) || /^→/.test(line)) {
                        const content = line.replace(/^[-•→]\s*/, '');
                        return (
                          <div key={j} className={`flex items-start gap-2 text-[13px] leading-relaxed rounded-xl px-2 py-1 ${
                            isNormalLine ? 'text-emerald-800 bg-emerald-50' :
                            isAbnormalLine ? 'text-amber-800 bg-amber-50 font-semibold' :
                            cfg.title + ' '}`}>
                            <span className="flex-shrink-0 mt-0.5">
                              {isNormalLine ? '✅' : isAbnormalLine ? '⚠️' : '→'}
                            </span>
                            <span>{inlineParse(content)}</span>
                          </div>
                        );
                      }
                      return (
                        <p key={j} className={`text-[13px] leading-relaxed ${cfg.title}`}>
                          {inlineParse(line)}
                        </p>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      <p className="text-[10px] text-slate-400 text-center pt-1 pb-1">
        Yeh sirf ek analysis hai — hamesha apne doctor se confirm karein
      </p>
    </div>
  );
}

// ── Quick action chips ────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { label: '🤒 Symptoms batao', value: 'Mujhe kuch symptoms hain, help karo: ' },
  { label: '📋 Report explain karo', value: 'Meri report explain karo' },
  { label: '💊 Medicine poochho', value: 'Ek medicine ke baare mein poochhna hai: ' },
  { label: '🩺 Doctor chahiye', value: 'Mujhe doctor dhundne mein help karo' },
];

// ────────────────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [triage, setTriage] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [loadingType, setLoadingType] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const router = useRouter();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) setIsSidebarOpen(true);
  }, []);

  // ── Voice ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      setVoiceSupported(true);
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'hi-IN';
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      recognitionRef.current = rec;
    }
    if (window.speechSynthesis) synthRef.current = window.speechSynthesis;
    return () => { recognitionRef.current?.abort(); synthRef.current?.cancel(); };
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) return;
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const speakText = useCallback((text) => {
    if (!synthRef.current || !text) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text.substring(0, 300));
    utterance.lang = 'hi-IN';
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthRef.current.speak(utterance);
  }, []);

  // ── Auto scroll ──────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, triage, loading]);

  // ── Sessions ─────────────────────────────────────────────────────────────
  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchMessages(currentSessionId);
    } else {
      setMessages([{
        role: 'assistant',
        text: 'Namaste! 🙏 Main Neural Nurture hoon — aapka AI health companion.\n\nAap Hindi, English, ya Hinglish mein baat kar sakte hain. Apne symptoms batayein ya medical report upload karein.',
        ts: nowTime(),
      }]);
      setTriage(null);
    }
  }, [currentSessionId]);

  const fetchSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('chat_sessions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) setSessions(data);
  };

  const fetchMessages = async (sessionId) => {
    const { data } = await supabase.from('chat_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true });
    if (data?.length) {
      let lastTriage = null;
      const parsed = data.map(m => {
        let text = m.content;
        let type = null;
        if (text?.includes('||TRIAGE_DATA||')) {
          const parts = text.split('||TRIAGE_DATA||');
          text = parts[0];
          try { lastTriage = JSON.parse(parts[1]); } catch (_) {}
        }
        if (text?.includes('||TYPE||')) {
          const parts = text.split('||TYPE||');
          text = parts[0];
          type = parts[1];
        }
        return { role: m.role, text, type };
      });
      setMessages(parsed);
      setTriage(lastTriage);
    }
  };

  const clearChat = async () => {
    setShowClearConfirm(false);
    setMessages([]);
    setTriage(null);
    synthRef.current?.cancel();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && currentSessionId) {
        await supabase.from('chat_messages').delete().eq('session_id', currentSessionId);
        await supabase.from('chat_sessions').delete().eq('id', currentSessionId);
      }
    } catch (error) {
      console.error('[Clear Chat]:', error);
    }
    setCurrentSessionId(null);
    fetchSessions();
    setMessages([{
      role: 'assistant',
      text: 'Namaste! Main aapka AI health assistant hoon. 🙏 Aap kaise feel kar rahe hain aaj?',
      ts: nowTime(),
    }]);
  };

  // ── Image compression ─────────────────────────────────────────────────────
  const compressImage = (file) => new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const maxWidth = 800;
      const ratio = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });

  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });

  // ── Image upload ─────────────────────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const isImage = file.type.startsWith('image/');
    const imagePreviewUrl = isImage ? URL.createObjectURL(file) : null;

    setMessages(prev => [...prev, {
      role: 'user',
      text: file.name,
      fileName: file.name,
      imagePreview: imagePreviewUrl,
      ts: nowTime(),
    }]);
    setLoading(true);
    setLoadingType('analyzing');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      let base64;
      let finalMimeType = file.type || 'image/jpeg';
      if (isImage) {
        const compressed = await compressImage(file);
        base64 = compressed.split(',')[1];
        finalMimeType = 'image/jpeg';
      } else {
        base64 = await fileToBase64(file);
      }

      const locationStr = typeof window !== 'undefined' ? localStorage.getItem('user_temp_location') : null;
      const location = locationStr ? JSON.parse(locationStr) : null;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType: finalMimeType, location }),
      });
      const data = await res.json();
      const reply = data.reply || data.message || 'Report analyze nahi ho payi. Dobara try karein.';
      const msgType = data.type || null;

      let sessionId = currentSessionId;
      if (!sessionId) {
        const { data: session } = await supabase.from('chat_sessions')
          .insert({ user_id: user.id, title: data.predictedTitle || file.name.substring(0, 40) })
          .select().single();
        if (session) { sessionId = session.id; setCurrentSessionId(sessionId); fetchSessions(); }
      }

      setMessages(prev => [...prev, { role: 'assistant', text: reply, type: msgType, ts: nowTime() }]);
      speakText(reply.split(/[.।!?]/)[0]);

      if (sessionId) {
        await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'user', content: `📎 ${file.name}` });
        const contentToSave = reply + (msgType ? `||TYPE||${msgType}` : '');
        await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'assistant', content: contentToSave });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Image upload mein error aayi. Dobara try karein.', ts: nowTime() }]);
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  // ── Text send ─────────────────────────────────────────────────────────────
  const handleSend = async (msgOverride) => {
    const capturedMessage = (msgOverride || input).trim();
    if (!capturedMessage) return;
    synthRef.current?.cancel();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: capturedMessage, ts: nowTime() }]);
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const conversationHistory = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
      const locationStr = typeof window !== 'undefined' ? localStorage.getItem('user_temp_location') : null;
      const location = locationStr ? JSON.parse(locationStr) : null;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: capturedMessage, conversationHistory, location }),
      });
      const data = await res.json();

      let sessionId = currentSessionId;
      if (!sessionId) {
        const { data: session } = await supabase.from('chat_sessions')
          .insert({ user_id: user.id, title: data.predictedTitle || capturedMessage.substring(0, 40) })
          .select().single();
        if (session) { sessionId = session.id; setCurrentSessionId(sessionId); fetchSessions(); }
      }

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply, type: data.type || null, ts: nowTime() }]);
        speakText(data.reply.split(/[.।!?]/)[0]);
      }
      if (data.triage) setTriage(data.triage);

      if (sessionId) {
        await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'user', content: capturedMessage });
        if (data.reply) {
          const contentToSave = data.reply
            + (data.triage ? `||TRIAGE_DATA||${JSON.stringify(data.triage)}` : '')
            + (data.type ? `||TYPE||${data.type}` : '');
          await supabase.from('chat_messages').insert({ session_id: sessionId, role: 'assistant', content: contentToSave });
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Connection error. Please try again.', ts: nowTime() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const showWelcomeChips = messages.length === 1 && messages[0].role === 'assistant' && !loading;

  return (
    <main className="pt-[60px] md:pt-20 h-screen flex overflow-hidden bg-background text-on-background font-sans">

      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-full md:w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'} fixed md:relative transition-all duration-300 bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden h-full z-50 md:z-20`}>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">History</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 text-slate-400">
              <span className="material-symbols-outlined text-[18px]">keyboard_double_arrow_left</span>
            </button>
          </div>
          <button
            onClick={() => { setCurrentSessionId(null); setMessages([]); setTriage(null); synthRef.current?.cancel(); }}
            className="w-full py-4 px-6 bg-blue-600 text-white rounded-2xl flex items-center justify-center gap-3 hover:bg-blue-700 transition-all font-black shadow-lg shadow-blue-600/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="text-[10px] uppercase tracking-[0.2em]">New Consultation</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 space-y-2 custom-scrollbar">
          {sessions.map(session => (
            <button key={session.id} onClick={() => setCurrentSessionId(session.id)}
              className={`w-full text-left p-4 rounded-xl flex items-center gap-3 transition-all ${currentSessionId === session.id ? 'bg-blue-600/10 text-blue-600 border border-blue-600/20' : 'hover:bg-slate-200/50 text-slate-600'}`}>
              <span className="material-symbols-outlined text-[18px]">clinical_notes</span>
              <span className="text-xs font-bold truncate flex-1">{session.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Chat */}
      <section className="flex-1 flex flex-col bg-white relative overflow-hidden h-full">

        {/* Header */}
        <div className="px-6 md:px-8 py-5 bg-white/80 backdrop-blur-xl flex items-center justify-between z-10 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`${isSidebarOpen ? 'md:hidden' : 'flex'} w-10 h-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all`}>
              <span className="material-symbols-outlined">{isSidebarOpen ? 'close' : 'history'}</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="material-symbols-outlined">smart_toy</span>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-widest">Neural Nurture</h1>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hindi · English · Hinglish</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {currentSessionId && (
              <button onClick={() => setShowClearConfirm(true)}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                title="Clear chat">
                <span className="material-symbols-outlined text-[20px]">delete_outline</span>
              </button>
            )}
            {isSpeaking && (
              <button onClick={() => synthRef.current?.cancel()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                <span className="material-symbols-outlined text-sm animate-pulse">volume_up</span>Stop
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-48 md:pb-52 scroll-smooth custom-scrollbar">

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col gap-1.5 ${msg.role === 'user' ? 'items-end ml-auto max-w-[85%] md:max-w-[75%]' : 'max-w-[95%] md:max-w-[85%]'}`}>
              {/* Role label */}
              <div className={`flex items-center gap-2 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[13px]">medical_services</span>
                  </div>
                )}
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {msg.role === 'user' ? 'You' : 'Neural Nurture'}
                </span>
                {msg.ts && <span className="text-[9px] text-slate-300 font-medium">{msg.ts}</span>}
                {msg.role === 'assistant' && (
                  <button onClick={() => speakText(msg.text)}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 hover:bg-blue-100 hover:text-blue-600 transition-all text-slate-400">
                    <span className="material-symbols-outlined text-[11px]">volume_up</span>
                  </button>
                )}
              </div>

              {/* Bubble */}
              <div className={`rounded-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border transition-all ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white border-slate-800 rounded-tr-sm px-5 py-4'
                  : msg.type === 'report_analysis'
                  ? 'bg-white text-slate-800 border-slate-100 rounded-tl-sm p-5'
                  : 'bg-white text-slate-800 border-slate-100 rounded-tl-sm px-5 py-4'
              }`}>
                {/* Image preview (user bubble) */}
                {msg.imagePreview && (
                  <div className="mb-3">
                    <img src={msg.imagePreview} alt="Uploaded report"
                      className="max-w-full max-h-48 rounded-2xl object-contain border border-white/10" />
                  </div>
                )}
                {/* File name without image */}
                {msg.fileName && !msg.imagePreview && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-white/10 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined text-blue-400 text-[16px]">description</span>
                    <span className="text-[11px] font-black uppercase tracking-widest truncate max-w-[200px]">{msg.fileName}</span>
                  </div>
                )}

                {/* Content */}
                {msg.role === 'user' ? (
                  // User: plain text, but skip if it's just the filename (already shown above)
                  msg.text && msg.text !== msg.fileName && (
                    <p className="text-[15px] font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  )
                ) : msg.type === 'report_analysis' ? (
                  <ReportAnalysisCard text={msg.text} />
                ) : (
                  <div className="text-slate-800">{renderMessage(msg.text)}</div>
                )}
              </div>
            </div>
          ))}

          {/* Quick action chips — shown only on initial welcome screen */}
          {showWelcomeChips && (
            <div className="flex flex-wrap gap-2 mt-2 ml-0">
              {QUICK_CHIPS.map((chip, i) => (
                <button key={i}
                  onClick={() => setInput(chip.value)}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-full text-sm font-semibold transition-all">
                  {chip.label}
                </button>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded-full text-sm font-semibold transition-all">
                📎 Report upload karo
              </button>
            </div>
          )}

          {/* Loading / typing indicator */}
          {loading && (
            loadingType === 'analyzing' ? (
              <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-3xl max-w-xs">
                <span className="material-symbols-outlined text-blue-600 animate-pulse text-xl">image_search</span>
                <div>
                  <p className="text-[13px] font-bold text-blue-700">Report analyze ho rahi hai...</p>
                  <div className="flex gap-1 mt-1.5">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 p-4 bg-slate-50 rounded-3xl w-fit border border-slate-100">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )
          )}

          {/* Triage Card */}
          {triage && triage.urgency !== 'none' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`rounded-3xl p-6 md:p-8 max-w-xl space-y-5 relative overflow-hidden border-l-4 ${
                triage.urgency === 'GREEN'
                  ? 'bg-emerald-50 border-l-emerald-500 border border-emerald-200'
                  : triage.urgency === 'YELLOW'
                  ? 'bg-amber-50 border-l-amber-500 border border-amber-200'
                  : 'bg-red-50 border-l-red-500 border border-red-200'
              }`}
            >
              {triage.urgency === 'RED' && (
                <div className="absolute top-5 right-5 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-2">Assessment</p>
                <p className={`text-base font-bold leading-relaxed ${
                  triage.urgency === 'GREEN' ? 'text-emerald-700' :
                  triage.urgency === 'YELLOW' ? 'text-amber-700' : 'text-red-700'}`}>
                  {triage.assessment}
                </p>
                {triage.likely_cause && (
                  <p className="text-sm text-slate-600 mt-1">
                    <span className="font-bold">Condition:</span> {triage.likely_cause}
                  </p>
                )}
                {triage.specialist_needed && (
                  <p className="text-sm text-slate-600 mt-0.5">
                    <span className="font-bold">Doctor:</span> {triage.specialist_needed}
                  </p>
                )}
              </div>

              {triage.urgency === 'GREEN' && (
                <>
                  {(triage.homeCareAdvice || triage.home_care)?.length > 0 && (
                    <div className="bg-white/70 rounded-2xl p-4 border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">🌿 Ghar Par Ye Karein</p>
                      <ul className="space-y-1.5">
                        {(triage.homeCareAdvice || triage.home_care).map((s, i) => (
                          <li key={i} className="text-sm text-slate-700 flex gap-2">
                            <span className="text-emerald-500 font-bold">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {triage.watchOut?.length > 0 && (
                    <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">⚠️ Agar Yeh Ho Toh Doctor Ko Dikhao</p>
                      <ul className="space-y-1">
                        {triage.watchOut.map((w, i) => <li key={i} className="text-sm text-amber-800">• {w}</li>)}
                      </ul>
                    </div>
                  )}
                  <button onClick={() => setTriage(null)}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all">
                    Theek Ho Jaoge 💚
                  </button>
                </>
              )}

              {triage.urgency === 'YELLOW' && (
                <>
                  {(triage.advice || triage.home_care)?.length > 0 && (
                    <div className="bg-white/70 rounded-2xl p-4 border border-amber-100">
                      <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-2">📋 Doctor Se Pehle</p>
                      <ul className="space-y-1.5">
                        {(triage.advice || triage.home_care).map((s, i) => (
                          <li key={i} className="text-sm text-slate-700 flex gap-2">
                            <span className="text-amber-600 font-bold">•</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {triage.whatToTellDoctor?.length > 0 && (
                    <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">🗣️ Doctor Ko Ye Batao</p>
                      <ul className="space-y-1">
                        {triage.whatToTellDoctor.map((info, i) => <li key={i} className="text-sm text-blue-800">• {info}</li>)}
                      </ul>
                    </div>
                  )}
                  {triage.redFlags?.length > 0 && (
                    <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">🚨 Agar Yeh Ho Toh Turant 108 Call Karein</p>
                      <ul className="space-y-1">
                        {triage.redFlags.map((rf, i) => <li key={i} className="text-sm text-red-700">• {rf}</li>)}
                      </ul>
                    </div>
                  )}
                  <Link href={`/doctors?specialty=${encodeURIComponent(triage.specialist_needed || '')}&filter=bestRating`}>
                    <button className="w-full py-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-base">local_hospital</span>
                      Nearby Doctors Dekho →
                    </button>
                  </Link>
                </>
              )}

              {triage.urgency === 'RED' && (
                <>
                  {(triage.immediateSteps || triage.emergencySteps)?.length > 0 && (
                    <div className="bg-white/80 rounded-2xl p-4 border-2 border-red-300">
                      <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2">🚨 Abhi Ye Karo</p>
                      <ul className="space-y-1.5">
                        {(triage.immediateSteps || triage.emergencySteps).map((s, i) => (
                          <li key={i} className="text-sm font-bold text-red-800 flex gap-2">
                            <span className="font-black text-red-600">{i + 1}.</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {triage.redFlags?.length > 0 && (
                    <div className="bg-red-100 rounded-2xl p-4 border border-red-300">
                      <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2">⚠️ Warning Signs</p>
                      <ul className="space-y-1">
                        {triage.redFlags.map((rf, i) => <li key={i} className="text-sm text-red-800">• {rf}</li>)}
                      </ul>
                    </div>
                  )}
                  <div className="space-y-2">
                    <a href="tel:108" className="block w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-center text-sm transition-all shadow-lg shadow-red-600/30 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">phone</span>
                      108 Call Karein — Free Ambulance 🚨
                    </a>
                    <Link href="/doctors?specialty=Emergency&filter=openNow">
                      <button className="w-full py-3.5 rounded-2xl border-2 border-red-400 text-red-600 font-black text-sm uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-base">local_hospital</span>
                        Nearest ER Dekho →
                      </button>
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input bar */}
        <div className="absolute bottom-[60px] md:bottom-0 left-0 w-full p-4 md:p-6 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none">
          <div className="max-w-4xl mx-auto space-y-2 pointer-events-auto">

            {/* Listening indicator */}
            {isListening && (
              <div className="flex items-center gap-3 px-5 py-2.5 bg-red-50 border border-red-200 rounded-full w-fit">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[11px] font-black text-red-600 uppercase tracking-widest">Sun raha hoon... 🎤</span>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-center gap-2 bg-slate-50 p-2 pl-4 md:pl-5 rounded-full border border-slate-200 shadow-2xl focus-within:border-blue-500/50 transition-all">
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*,application/pdf" />

              {/* Attach */}
              <button type="button" onClick={() => fileInputRef.current.click()}
                className="h-10 w-10 flex items-center justify-center rounded-full transition-all bg-white text-slate-400 border border-slate-100 hover:bg-slate-50 hover:text-blue-600 flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">attachment</span>
              </button>

              {/* Text input */}
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none focus:outline-none text-slate-900 font-medium text-sm py-3 min-w-0"
                placeholder="Apne symptoms batayein ya Hindi mein type karein..." />

              {/* Mic */}
              {voiceSupported && (
                <button type="button" onClick={toggleVoiceInput}
                  className={`h-10 w-10 flex items-center justify-center rounded-full transition-all flex-shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50 hover:text-blue-600'}`}
                  title={isListening ? 'Stop listening' : 'Voice input'}>
                  <span className="material-symbols-outlined text-[20px]">{isListening ? 'mic_off' : 'mic'}</span>
                </button>
              )}

              {/* Send */}
              <button type="submit" disabled={loading || !input.trim()}
                className="h-10 w-10 md:h-11 md:w-11 flex items-center justify-center bg-blue-600 text-white rounded-full shadow-lg hover:scale-105 transition-all disabled:opacity-30 flex-shrink-0">
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>

            <p className="text-center text-[9px] text-slate-400 font-medium">
              Hindi mein type karein ya mic use karein 🎤 · Neural Nurture guides — always consult a doctor
            </p>
          </div>
        </div>
      </section>

      {/* Clear Chat Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-[24px]">delete_outline</span>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Chat Clear Karein?</h3>
                <p className="text-sm text-slate-500">Yeh conversation delete ho jayegi</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Aap apne sare messages delete karna chahte hain? Yeh action reverse nahi ho sakta.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all">
                Raho
              </button>
              <button onClick={clearChat}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">delete</span>
                Haan, Delete Karo
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </main>
  );
}
