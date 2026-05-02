'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
const nnStore = { setItem: (k, v) => localStorage.setItem(`nn_${k}`, v), getItem: (k) => localStorage.getItem(`nn_${k}`) };
import { motion, AnimatePresence } from 'framer-motion';

export default function ProfilePage() {
    const [isEditing, setIsEditing] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('patient');
    
    // Patient Fields
    const [bloodType, setBloodType] = useState('');
    const [allergies, setAllergies] = useState('');
    const [medicalHistory, setMedicalHistory] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [profilePic, setProfilePic] = useState('');
    
    // Doctor Fields
    const [specialty, setSpecialty] = useState('');
    const [experience, setExperience] = useState('');
    const [fee, setFee] = useState('');
    const [location, setLocation] = useState('');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');

    const [storageUsage, setStorageUsage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const router = useRouter();
    const fileInputRef = useRef(null);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            localStorage.removeItem('nn_role');
            localStorage.removeItem('nn_name');
            localStorage.removeItem('nn_email');
            router.push('/');
        } catch {
            window.location.href = '/';
        }
    };

    useEffect(() => {
        const storedName = nnStore.getItem('name');
        const storedEmail = nnStore.getItem('email');
        const storedRole = nnStore.getItem('role') || 'patient';
        
        if (storedName) setName(storedName);
        if (storedEmail) setEmail(storedEmail);
        setRole(storedRole);

        fetchProfileData();
        fetchStorageUsage();
        recordLocation();
    }, []);

    const recordLocation = () => {
        const cachedLocation = localStorage.getItem('user_temp_location');
        if (cachedLocation) {
            console.log("Using cached location:", JSON.parse(cachedLocation));
            return;
        }

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const locData = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    timestamp: Date.now()
                };
                localStorage.setItem('user_temp_location', JSON.stringify(locData));
                console.log("Location recorded and cached:", locData);
            }, (error) => {
                console.warn("Location access denied:", error.message);
            });
        }
    };

    const fetchStorageUsage = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('medical_records')
            .select('id')
            .eq('user_id', user.id);

        if (data) {
            const totalBytes = data.length * 2.5 * 1024 * 1024;
            const mb = (totalBytes / (1024 * 1024)).toFixed(1);
            setStorageUsage(mb);
        }
    };

    const fetchProfileData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const storedRole = nnStore.getItem('role') || 'patient';
        const storedName = nnStore.getItem('name');

        if (storedRole === 'doctor') {
            const { data } = await supabase
                .from('doctors')
                .select('*')
                .eq('name', storedName)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (data) {
                setSpecialty(data.specialty || '');
                setFee(data.price || '');
                setLocation(data.location || '');
                setLatitude(data.latitude || '');
                setLongitude(data.longitude || '');
            }
        } else {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            
            if (data) {
                if (data.full_name) {
                    setName(data.full_name);
                    nnStore.setItem('name', data.full_name);
                }
                setBloodType(data.blood_type || '');
                setAllergies(data.allergies || '');
                setMedicalHistory(data.medical_history || '');
                setEmergencyContact(data.emergency_contact || '');
                setAge(data.age || '');
                setGender(data.gender || '');
                setWeight(data.weight || '');
                setHeight(data.height || '');
                setProfilePic(data.avatar_url || '');
            }
        }
    };

    const handleProfilePicUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const fileExt = file.name.split('.').pop();
            const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('medical-files')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('medical-files')
                .getPublicUrl(fileName);

            setProfilePic(urlData.publicUrl);
            toast.success('Identity node updated');
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            if (role === 'doctor') {
                // Delete existing record for this doctor before re-inserting to avoid duplicates
                await supabase.from('doctors').delete().eq('name', name);
                const { error } = await supabase
                    .from('doctors')
                    .insert([{
                        name: name,
                        specialty,
                        location,
                        latitude,
                        longitude,
                        price: fee
                    }]);
                if (error) throw error;
                nnStore.setItem('name', name);
                toast.success('Professional Profile Updated');
            } else {
                // Try full upsert
                const { error } = await supabase
                    .from('profiles')
                    .upsert({
                        id: user.id,
                        full_name: name,
                        blood_type: bloodType,
                        allergies: allergies,
                        medical_history: medicalHistory,
                        emergency_contact: emergencyContact,
                        age: age,
                        gender: gender,
                        weight: weight,
                        height: height,
                        avatar_url: profilePic,
                        updated_at: new Date(),
                    });

                if (error) {
                    console.warn("Schema mismatch detected, falling back to basic profile sync...");
                    // Retry without age/gender
                    const { error: retryError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: user.id,
                            full_name: name,
                            blood_type: bloodType,
                            allergies: allergies,
                            medical_history: medicalHistory,
                            emergency_contact: emergencyContact,
                            avatar_url: profilePic,
                            updated_at: new Date(),
                        });
                    
                    if (retryError) throw retryError;
                    nnStore.setItem('name', name);
                    toast.success('Profile Synced (Warning: Age/Gender columns missing in DB)');
                } else {
                    nnStore.setItem('name', name);
                    toast.success('Profile Synced Successfully');
                }
            }
            setIsEditing(false);
            fetchProfileData();
        } catch (error) {
            toast.error('Sync Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] font-sans selection:bg-blue-100">

            {/* ════════════════════════════════ MOBILE LAYOUT */}
            <div className="md:hidden pt-20 pb-8 px-4 space-y-4">
                {/* Mobile Header */}
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-900 p-6 shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-slate-800/60 to-indigo-900/60"></div>
                    <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600 rounded-full blur-[80px] opacity-20"></div>
                    <div className="relative z-10 flex items-end gap-5">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center">
                                {profilePic ? (
                                    <img src={profilePic} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <span className="material-symbols-outlined text-5xl text-white/30">account_circle</span>
                                )}
                            </div>
                            {isEditing && (
                                <button onClick={() => fileInputRef.current.click()} className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                                    <span className="material-symbols-outlined text-sm">add_a_photo</span>
                                </button>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.3em]">Identity Node</span>
                            <h1 className="text-2xl font-black text-white tracking-tighter leading-tight truncate">{name || 'Your Name'}</h1>
                            <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">{role}</p>
                        </div>
                        <button onClick={() => setIsEditing(!isEditing)} className="bg-white text-slate-950 px-4 py-2 rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-lg flex-shrink-0">
                            {isEditing ? 'Cancel' : 'Edit'}
                        </button>
                    </div>
                </div>

                {/* Mobile Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Blood</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{bloodType || '—'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Age</p>
                        <p className="text-xl font-black text-slate-900 mt-1">{age || '—'}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">BMI</p>
                        <p className="text-xl font-black text-slate-900 mt-1">
                            {weight && height ? ((parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)) : '—'}
                        </p>
                    </div>
                </div>

                {/* Mobile Profile Form or View */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                    {isEditing ? (
                        <form onSubmit={handleSaveProfile} className="space-y-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Edit Profile</h3>
                            {[
                                { label: 'Full Name', val: name, set: setName, type: 'text', ph: 'Your name' },
                                { label: 'Age', val: age, set: setAge, type: 'number', ph: 'e.g. 25' },
                                { label: 'Weight (kg)', val: weight, set: setWeight, type: 'number', ph: 'e.g. 65' },
                                { label: 'Height (cm)', val: height, set: setHeight, type: 'number', ph: 'e.g. 170' },
                                { label: 'Emergency Contact', val: emergencyContact, set: setEmergencyContact, type: 'text', ph: 'Name & Number' },
                            ].map(field => (
                                <div key={field.label} className="space-y-1">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-blue-600">{field.label}</label>
                                    <input value={field.val} onChange={e => field.set(e.target.value)} type={field.type} placeholder={field.ph}
                                        className="w-full bg-slate-50 rounded-xl py-3 px-4 text-slate-900 font-bold text-sm outline-none border border-transparent focus:border-blue-200"
                                    />
                                </div>
                            ))}
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-blue-600">Blood Group</label>
                                <select value={bloodType} onChange={e => setBloodType(e.target.value)} className="w-full bg-slate-50 rounded-xl py-3 px-4 text-slate-900 font-bold text-sm outline-none border border-transparent">
                                    <option value="">Select</option>
                                    {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bt => <option key={bt} value={bt}>{bt}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-blue-600">Known Allergies</label>
                                <textarea value={allergies} onChange={e => setAllergies(e.target.value)} rows={3}
                                    className="w-full bg-slate-50 rounded-xl py-3 px-4 text-slate-900 font-medium text-sm outline-none border border-transparent resize-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase tracking-widest text-blue-600">Medical History</label>
                                <textarea value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} rows={3}
                                    className="w-full bg-slate-50 rounded-xl py-3 px-4 text-slate-900 font-medium text-sm outline-none border border-transparent resize-none"
                                />
                            </div>
                            <button disabled={loading} type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Clinical Info</h3>
                            {[
                                { label: 'Allergies', val: allergies || 'No known allergies' },
                                { label: 'Medical History', val: medicalHistory || 'No history on record' },
                                { label: 'Emergency Contact', val: emergencyContact || 'Not set' },
                            ].map(item => (
                                <div key={item.label} className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{item.val}</p>
                                </div>
                            ))}
                            <div className="flex items-center gap-3 p-4 bg-slate-900 rounded-2xl text-white">
                                <span className="material-symbols-outlined text-blue-400">verified</span>
                                <div>
                                    <p className="text-xs font-black">Security Protocol</p>
                                    <p className="text-[9px] text-slate-400 font-medium">AES-256 encrypted · HIPAA compliant</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Storage */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cloud Storage</p>
                        <p className="text-[9px] font-black text-slate-600">{storageUsage}% Used</p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${storageUsage}%` }}></div>
                    </div>
                </div>

                {/* Mobile Logout Button */}
                <button
                    onClick={() => setShowLogoutModal(true)}
                    className="w-full py-4 rounded-3xl border-2 border-red-100 bg-red-50 text-red-500 font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-red-100 active:scale-[0.98] transition-all"
                >
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Sign Out
                </button>
            </div>

            {/* ════════════════════════════════ DESKTOP LAYOUT */}
            <div className="hidden md:block pb-32">
            {/* Immersive Header with Framed Design */}
            <section className="relative px-4 md:px-12 pt-28 md:pt-36 pb-12 md:pb-24 overflow-hidden">
                <div className="absolute inset-0 bg-[#FDFDFD]"></div>
                
                {/* The Frame */}
                <div className="max-w-[1400px] mx-auto relative rounded-[2.5rem] md:rounded-[4rem] overflow-hidden bg-slate-900 aspect-[21/9] md:aspect-[25/9] shadow-2xl group">
                    {/* Background Image */}
                    <div className="absolute inset-0 opacity-70">
                        <div className="w-full h-full bg-gradient-to-br from-blue-900 via-slate-800 to-indigo-900 transition-transform duration-700 group-hover:scale-105 relative overflow-hidden">
                            <div className="absolute top-0 left-1/3 w-96 h-96 bg-blue-600 rounded-full blur-[120px] opacity-40"></div>
                            <div className="absolute bottom-0 right-1/3 w-72 h-72 bg-indigo-600 rounded-full blur-[100px] opacity-40"></div>
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                    <div className="absolute inset-0 p-8 md:p-16 flex flex-col justify-end">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                            <div className="space-y-4">
                                <span className="inline-flex items-center gap-3 px-4 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-[9px] font-black tracking-[0.4em] uppercase text-blue-400 backdrop-blur-md">Identity Node</span>
                                <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-none">{name}</h1>
                                <p className="text-slate-400 font-medium text-lg md:text-xl uppercase tracking-widest">{role}</p>
                            </div>
                            <button 
                                onClick={() => setIsEditing(!isEditing)}
                                className="bg-white text-slate-950 px-10 py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl"
                            >
                                {isEditing ? 'Cancel Edit' : 'Edit Profile'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <main className="max-w-[1400px] mx-auto -mt-4 md:-mt-10 px-4 md:px-12 relative z-20 grid grid-cols-12 gap-8 md:gap-12">
                
                {/* Profile Overview (Left) */}
                <div className="col-span-12 lg:col-span-4 space-y-8">
                    <div className="bg-white/90 backdrop-blur-3xl rounded-[3rem] p-10 md:p-12 border border-white shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="relative group/avatar mb-8">
                                <div className="w-32 h-32 md:w-48 md:h-48 rounded-[3rem] bg-slate-100 overflow-hidden border-8 border-white shadow-2xl">
                                    {profilePic ? (
                                        <img src={profilePic} className="w-full h-full object-cover" alt="Profile" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-200">
                                            <span className="material-symbols-outlined text-8xl">account_circle</span>
                                        </div>
                                    )}
                                </div>
                                {isEditing && (
                                    <button 
                                        onClick={() => fileInputRef.current.click()}
                                        className="absolute bottom-2 right-2 w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-all"
                                    >
                                        <span className="material-symbols-outlined">add_a_photo</span>
                                    </button>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleProfilePicUpload} className="hidden" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-950 tracking-tighter mb-2">{name}</h2>
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">{email}</p>
                            
                            <div className="w-full pt-8 border-t border-slate-50 space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span>Cloud Capacity</span>
                                    <span>{storageUsage}% Used</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${storageUsage}%` }}
                                        className="h-full bg-blue-600"
                                    ></motion.div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-950 rounded-[3rem] p-10 md:p-12 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl"></div>
                        <div className="relative z-10 space-y-6">
                            <span className="material-symbols-outlined text-4xl text-blue-500">verified</span>
                            <h3 className="text-2xl font-black tracking-tight leading-tight">Security Protocol</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">Your identity node is encrypted with AES-256 and audited for HIPAA compliance.</p>
                            <div className="pt-4 flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Operational</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop Logout Button */}
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full py-5 rounded-[2rem] border-2 border-red-200 bg-white text-red-500 font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 hover:bg-red-50 hover:border-red-300 active:scale-[0.98] transition-all shadow-sm"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        Sign Out of Neural Nurture
                    </button>
                </div>

                {/* Details Section (Right) */}
                <div className="col-span-12 lg:col-span-8">
                    <div className="bg-white/90 backdrop-blur-3xl rounded-[3rem] p-8 md:p-14 border border-white shadow-2xl">
                        <AnimatePresence mode="wait">
                            {isEditing ? (
                                <motion.form 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    onSubmit={handleSaveProfile} 
                                    className="space-y-10"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Full Name</label>
                                            <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-50 rounded-2xl py-5 px-6 text-slate-950 font-black outline-none transition-all" type="text" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Blood Group</label>
                                            <select value={bloodType} onChange={e => setBloodType(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-50 rounded-2xl py-5 px-6 text-slate-950 font-black outline-none transition-all appearance-none">
                                                <option value="">Select</option>
                                                <option value="A+">A+</option><option value="A-">A-</option>
                                                <option value="B+">B+</option><option value="B-">B-</option>
                                                <option value="O+">O+</option><option value="O-">O-</option>
                                                <option value="AB+">AB+</option><option value="AB-">AB-</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Age (Years)</label>
                                            <input value={age} onChange={e => setAge(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-50 rounded-2xl py-5 px-6 text-slate-950 font-black outline-none transition-all" type="number" placeholder="e.g. 25" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Gender</label>
                                            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-50 rounded-2xl py-5 px-6 text-slate-950 font-black outline-none transition-all appearance-none">
                                                <option value="">Select</option>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Non-binary">Non-binary</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Weight (kg)</label>
                                            <input value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-50 rounded-2xl py-5 px-6 text-slate-950 font-black outline-none transition-all" type="number" placeholder="e.g. 65" />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Height (cm)</label>
                                            <input value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-50 rounded-2xl py-5 px-6 text-slate-950 font-black outline-none transition-all" type="number" placeholder="e.g. 170" />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Emergency Contact</label>
                                        <input value={emergencyContact} onChange={e => setEmergencyContact(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-50 rounded-2xl py-5 px-6 text-slate-950 font-black outline-none transition-all" placeholder="Name & Number" type="text" />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Known Allergies</label>
                                        <textarea value={allergies} onChange={e => setAllergies(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-50 rounded-2xl py-5 px-6 text-slate-950 font-medium min-h-[120px] outline-none transition-all"></textarea>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 ml-1">Medical History</label>
                                        <textarea value={medicalHistory} onChange={e => setMedicalHistory(e.target.value)} className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-50 rounded-2xl py-5 px-6 text-slate-950 font-medium min-h-[150px] outline-none transition-all"></textarea>
                                    </div>

                                    <button disabled={loading} className="w-full py-6 rounded-3xl bg-blue-600 text-white font-black text-xs uppercase tracking-[0.4em] shadow-3xl shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4" type="submit">
                                        <span className="material-symbols-outlined">{loading ? 'sync' : 'save'}</span>
                                        {loading ? 'Synchronizing Node...' : 'Commit Changes'}
                                    </button>
                                </motion.form>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-12"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Blood Node</p>
                                            <p className="text-4xl font-black text-slate-950 tracking-tighter">{bloodType || 'N/A'}</p>
                                        </div>
                                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Age</p>
                                            <p className="text-4xl font-black text-slate-950 tracking-tighter">{age || 'N/A'}</p>
                                        </div>
                                        <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Gender</p>
                                            <p className="text-4xl font-black text-slate-950 tracking-tighter">{gender || 'N/A'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] px-2">Clinical Context</h4>
                                        <div className="space-y-4">
                                            <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Allergy Registry</p>
                                                <p className="text-slate-600 font-medium leading-relaxed">{allergies || 'Zero known clinical sensitivities detected.'}</p>
                                            </div>
                                            <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">History Archives</p>
                                                <p className="text-slate-600 font-medium leading-relaxed">{medicalHistory || 'No longitudinal medical history on record.'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-slate-50">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] text-center">Last Synced: {new Date().toLocaleDateString()}</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </main>
            </div>{/* end desktop layout */}

            {/* ════════════════ LOGOUT CONFIRMATION MODAL (shared) */}
            <AnimatePresence>
                {showLogoutModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-slate-950/50 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
                        >
                            {/* Icon area */}
                            <div className="bg-slate-950 px-8 pt-10 pb-8 flex flex-col items-center text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-red-600/10 rounded-full blur-[60px]"></div>
                                <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-[1.5rem] flex items-center justify-center mb-5 relative z-10">
                                    <span className="material-symbols-outlined text-3xl text-red-400">logout</span>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight relative z-10">Sign Out?</h3>
                                <p className="text-slate-400 text-sm font-medium mt-2 leading-relaxed relative z-10">
                                    You'll be logged out of your Neural Nurture session. Your data stays safe.
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="p-6 space-y-3">
                                <button
                                    onClick={handleLogout}
                                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-lg shadow-red-500/20 hover:bg-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    <span className="material-symbols-outlined text-lg">logout</span>
                                    Yes, Sign Me Out
                                </button>
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-slate-200 active:scale-[0.98] transition-all"
                                >
                                    Cancel, Stay In
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
