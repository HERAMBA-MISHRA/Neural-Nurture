"use client";
import Link from 'next/link';
import { motion, useScroll, useSpring } from 'framer-motion';
import { useEffect, useState } from 'react';

const fadeUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: "easeOut" }
};

const hoverScale = {
    whileHover: { scale: 1.05, transition: { duration: 0.3 } },
    whileTap: { scale: 0.95 }
};

export default function LandingPage() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001
    });

    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="bg-[#f8faff] text-slate-900 font-['Plus_Jakarta_Sans'] selection:bg-indigo-100 selection:text-indigo-900 scroll-smooth">
            {/* Progress Bar */}
            <motion.div className="fixed top-0 left-0 right-0 h-1 bg-blue-600 z-[100] origin-left" style={{ scaleX }} />

            {/* TopNavBar */}
            <nav className={`fixed top-0 w-full z-50 transition-all duration-500 px-6 md:px-10 h-20 flex justify-between items-center max-w-[1440px] left-1/2 -translate-x-1/2 ${scrolled ? 'bg-white/90 backdrop-blur-2xl border-b border-slate-100 shadow-sm top-2 rounded-3xl' : 'bg-transparent'}`}>
                <div className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter">Neural Nurture</div>
                <div className="hidden md:flex items-center gap-10">
                    <a className="text-slate-500 font-bold hover:text-blue-600 transition-all text-xs uppercase tracking-widest" href="#platform">Platform</a>
                    <a className="text-slate-500 font-bold hover:text-blue-600 transition-all text-xs uppercase tracking-widest" href="#precision-care">Precision Care</a>
                    <a className="text-slate-500 font-bold hover:text-blue-600 transition-all text-xs uppercase tracking-widest" href="#ecosystem">Ecosystem</a>
                </div>
                <div className="flex items-center gap-3 md:gap-6">
                    <Link href="/login" className="hidden md:block text-slate-500 font-bold text-xs uppercase tracking-widest hover:text-slate-900 transition-all">Sign In</Link>
                    <Link href="/login">
                        <motion.button {...hoverScale} className="bg-blue-600 text-white px-5 md:px-8 py-2.5 md:py-3 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-200/50">
                            <span className="hidden md:inline">Create Account</span>
                            <span className="md:hidden">Get Started</span>
                        </motion.button>
                    </Link>
                </div>
            </nav>

            <main>
                {/* Hero Section */}
                <section id="platform" className="relative min-h-screen flex items-center px-4 md:px-10 overflow-hidden pt-20">
                    <div className="max-w-[1440px] mx-auto w-full grid lg:grid-cols-2 gap-16 items-center">
                        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="space-y-10">
                            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100">
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                                The Future of Longevity
                            </div>
                                            <h1 className="text-4xl md:text-8xl font-black tracking-tight leading-[0.95] text-slate-900">
                                Precision Health, <br />
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-400 bg-clip-text text-transparent">Reimagined.</span>
                            </h1>
                            <p className="text-lg text-slate-500 max-w-lg leading-relaxed font-medium">
                                Neural Nurture merges clinical expertise with advanced neural processing to deliver a healthcare experience that is predictive, proactive, and deeply personal.
                            </p>
                            <div className="flex flex-wrap items-center gap-6 pt-4">
                                <Link href="/login">
                                    <motion.button {...hoverScale} className="bg-blue-600 text-white px-10 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-blue-500/30">Get Started Now</motion.button>
                                </Link>
                                <button className="flex items-center gap-4 font-black text-slate-400 hover:text-slate-900 transition-all uppercase text-[10px] tracking-widest group">
                                    <span className="w-14 h-14 flex items-center justify-center rounded-full bg-white shadow-xl group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-blue-600">play_arrow</span>
                                    </span>
                                    The Platform Experience
                                </button>
                            </div>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="relative">
                            <div className="relative rounded-[3rem] md:rounded-[5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.1)] group">
                                <div className="w-full h-[300px] md:h-[600px] bg-gradient-to-br from-slate-700 via-blue-900 to-slate-950 transition-transform duration-1000 group-hover:scale-110 relative overflow-hidden flex items-center justify-center">
                                <div className="absolute inset-0 opacity-30">
                                    <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-blue-500 rounded-full blur-[100px]"></div>
                                    <div className="absolute bottom-1/4 right-1/3 w-56 h-56 bg-indigo-500 rounded-full blur-[80px]"></div>
                                </div>
                                <span className="material-symbols-outlined text-[180px] text-blue-300/20">ecg_heart</span>
                            </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                            </div>
                            
                            {/* Floating Stats UI */}
                            <motion.div 
                                animate={{ y: [0, -20, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-10 -right-6 md:-right-10 glass-card bg-white/80 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white shadow-2xl z-10 hidden md:block"
                            >
                                <div className="flex items-center justify-between mb-6 gap-10">
                                    <div>
                                        <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Vitality Index</p>
                                        <h3 className="text-4xl font-black text-slate-900">98.4%</h3>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <span className="material-symbols-outlined font-black">ecg_heart</span>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} transition={{ duration: 2 }} className="h-full bg-blue-600" />
                                </div>
                            </motion.div>

                            <motion.div 
                                animate={{ x: [0, 20, 0] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -bottom-10 -left-6 md:-left-10 glass-card bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-white shadow-xl z-20 flex items-center gap-5 hidden md:flex"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                    <span className="material-symbols-outlined">neurology</span>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Neural Sync</p>
                                    <p className="text-sm font-black text-slate-800">Analysis Active</p>
                                </div>
                            </motion.div>
                        </motion.div>
                    </div>
                </section>

                {/* Ecosystem Section */}
                <section id="ecosystem" className="py-32 px-6 md:px-10 bg-white">
                    <div className="max-w-[1440px] mx-auto">
                        <motion.div {...fadeUp} className="max-w-2xl mb-24">
                            <h2 className="text-3xl md:text-6xl font-black tracking-tighter text-slate-900 mb-6 leading-none">Our Precision Ecosystem.</h2>
                            <p className="text-slate-500 font-medium text-lg leading-relaxed">Sophisticated technology designed for the most complex system of all: you.</p>
                        </motion.div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
                            <motion.div {...fadeUp} className="md:col-span-8 bg-slate-50 rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-12 flex flex-col justify-between group hover:shadow-3xl transition-all cursor-pointer relative overflow-hidden border border-slate-100">
                                <div className="relative z-10 max-w-sm">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-10 shadow-lg shadow-blue-200">
                                        <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                                    </div>
                                    <h3 className="text-2xl md:text-4xl font-black mb-4 md:mb-6 tracking-tight text-slate-900 leading-none">AI Triage Node</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed mb-10">Instant diagnostic synthesis powered by the world's most advanced clinical datasets. Clarity in seconds, not weeks.</p>
                                    <Link href="/login">
                                        <motion.button {...hoverScale} className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm border border-blue-50">Launch Diagnosis</motion.button>
                                    </Link>
                                </div>
                                {/* 3D Generated Asset */}
                                <div className="absolute bottom-[-10%] right-[-5%] w-[350px] md:w-[450px] h-[350px] md:h-[450px] flex items-end justify-end opacity-10 group-hover:opacity-20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-1000">
                                    <span className="material-symbols-outlined text-[220px] text-white">neurology</span>
                                </div>
                            </motion.div>

                            <motion.div {...fadeUp} className="md:col-span-4 bg-blue-600 rounded-[2rem] md:rounded-[3.5rem] p-8 md:p-12 text-white group hover:shadow-3xl transition-all cursor-pointer relative overflow-hidden">
                                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-10">
                                    <span className="material-symbols-outlined text-3xl text-white">medical_services</span>
                                </div>
                                <h3 className="text-2xl md:text-4xl font-black mb-4 md:mb-6 tracking-tighter leading-none">Specialist Matching</h3>
                                <p className="text-blue-100 font-medium leading-relaxed text-sm mb-12">Connect with verified experts matched precisely to your clinical requirements.</p>
                                <div className="absolute bottom-0 right-0 p-12">
                                    <Link href="/login">
                                        <motion.div whileHover={{ x: 10 }} className="w-16 h-16 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-2xl">
                                            <span className="material-symbols-outlined font-black">arrow_forward</span>
                                        </motion.div>
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Clinical Section */}
                <section id="precision-care" className="py-32 px-6 md:px-10 bg-[#f8faff]">
                    <div className="max-w-[1440px] mx-auto grid lg:grid-cols-2 gap-24 items-center">
                        <motion.div {...fadeUp} className="relative rounded-[4rem] overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.15)] group">
                            <div className="w-full h-[280px] md:h-[700px] bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 transition-transform duration-1000 group-hover:scale-105 relative flex items-center justify-center overflow-hidden">
                                <div className="absolute inset-0 opacity-30">
                                    <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-indigo-600 rounded-full blur-[120px]"></div>
                                    <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-blue-600 rounded-full blur-[80px]"></div>
                                </div>
                                <span className="material-symbols-outlined text-[200px] text-indigo-300/20">biotech</span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                            <div className="absolute bottom-12 left-12">
                                <div className="glass-card bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl text-white">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Facility Node</p>
                                    <p className="text-xl font-bold tracking-tight">Neural Nurture Research Center</p>
                                </div>
                            </div>
                        </motion.div>
                        
                        <motion.div {...fadeUp} className="space-y-12">
                            <div className="space-y-6">
                                <h2 className="text-3xl md:text-7xl font-black tracking-tighter text-slate-900 leading-[0.95]">
                                    Clinical Rigor. <br />
                                    <span className="text-blue-600">Human Care.</span>
                                </h2>
                                <p className="text-xl text-slate-500 leading-relaxed font-medium max-w-lg">
                                    We believe that the best healthcare doesn't just treat disease—it fosters vitality. Neural Nurture combines the power of big data with the warmth of personalized medical consultation.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 md:gap-12 border-y border-slate-200 py-8 md:py-12">
                                <div className="space-y-2">
                                    <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">50k+</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Patient Nodes</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none">100%</p>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Compliance Protocol</p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-6 pt-4">
                                <Link href="/login">
                                    <motion.button {...hoverScale} className="px-12 py-5 rounded-3xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-2xl">Read Case Studies</motion.button>
                                </Link>
                                <button className="px-12 py-5 rounded-3xl border-2 border-slate-200 font-black text-xs uppercase tracking-widest text-slate-500 hover:bg-white hover:border-blue-600 hover:text-blue-600 transition-all">Our Ethics</button>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* CTA Section */}
                <section id="about" className="py-32 px-6 md:px-10">
                    <div className="max-w-[1440px] mx-auto">
                        <motion.div {...fadeUp} className="bg-blue-600 rounded-[2rem] md:rounded-[4rem] p-8 md:p-32 text-center text-white relative overflow-hidden shadow-[0_50px_100px_rgba(37,99,235,0.3)]">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                            <div className="relative z-10 space-y-12">
                                <h2 className="text-3xl md:text-8xl font-black tracking-tighter leading-[0.95]">
                                    Start Your Precision <br />
                                    Journey Today.
                                </h2>
                                <p className="text-blue-100 text-xl max-w-2xl mx-auto font-medium leading-relaxed">
                                    Join thousands of patients who have unlocked a new standard of healthcare intelligence. Secured by AES-256 encryption.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-6 pt-6">
                                    <Link href="/login">
                                        <motion.button {...hoverScale} className="bg-white text-blue-600 px-12 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-2xl">Get Early Access</motion.button>
                                    </Link>
                                    <Link href="/login">
                                        <motion.button {...hoverScale} className="bg-white/10 text-white px-12 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest border border-white/20 backdrop-blur-xl">Speak to Experts</motion.button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-24 px-6 md:px-10 border-t border-slate-100">
                <div className="max-w-[1440px] mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-16">
                        <div className="space-y-8 max-w-xs">
                            <div className="text-3xl font-black text-slate-900 tracking-tighter">Neural Nurture</div>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed">Building the neural infrastructure for a proactive and predictive clinical future.</p>
                            <div className="flex items-center gap-6">
                                <motion.span whileHover={{ y: -5 }} className="material-symbols-outlined text-slate-400 hover:text-blue-600 cursor-pointer">share</motion.span>
                                <motion.span whileHover={{ y: -5 }} className="material-symbols-outlined text-slate-400 hover:text-blue-600 cursor-pointer">language</motion.span>
                                <motion.span whileHover={{ y: -5 }} className="material-symbols-outlined text-slate-400 hover:text-blue-600 cursor-pointer">monitoring</motion.span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-16 md:gap-32">
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Platform</h4>
                                <ul className="space-y-4 text-slate-500 text-xs font-bold">
                                    <li className="hover:text-blue-600 cursor-pointer transition-colors">Triage AI</li>
                                    <li className="hover:text-blue-600 cursor-pointer transition-colors">Neural Mesh</li>
                                    <li className="hover:text-blue-600 cursor-pointer transition-colors">Clinical Logs</li>
                                </ul>
                            </div>
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Compliance</h4>
                                <ul className="space-y-4 text-slate-500 text-xs font-bold">
                                    <li className="hover:text-blue-600 cursor-pointer transition-colors">Privacy Policy</li>
                                    <li className="hover:text-blue-600 cursor-pointer transition-colors">HIPAA Standards</li>
                                    <li className="hover:text-blue-600 cursor-pointer transition-colors">Encryption</li>
                                </ul>
                            </div>
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Company</h4>
                                <ul className="space-y-4 text-slate-500 text-xs font-bold">
                                    <li className="hover:text-blue-600 cursor-pointer transition-colors">Research</li>
                                    <li className="hover:text-blue-600 cursor-pointer transition-colors">Ethics</li>
                                    <li className="hover:text-blue-600 cursor-pointer transition-colors">Contact</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="mt-24 pt-12 border-t border-slate-50 text-center">
                        <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] flex items-center justify-center gap-4">
                            Made with <span className="text-blue-600 material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span> by <span className="text-slate-900">Jay</span>
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
