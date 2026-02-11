import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Bell,
    LogOut,
    Menu,
    X,
    Moon,
    Sun,
    Shield,
    FileText,
    Briefcase,
    Anchor,
    ShieldCheck,
    UserCircle,
    ChevronDown,
    Bug,
    Upload,
    Image as ImageIcon
} from 'lucide-react';

const SidebarItem = ({ icon, text, to }) => {
    const location = useLocation();
    const active = to ? location.pathname === to : false;
    const isActive = active || (to === '/' && location.pathname === '/');
    const content = (
        <>
            <span className={`mr-3 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                {icon}
            </span>
            {text}
        </>
    );
    const className = `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${isActive
        ? 'bg-indigo-50 dark:bg-dark-card text-indigo-600 dark:text-indigo-400 shadow-sm border border-transparent dark:border-slate-700'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-dark-card hover:text-slate-900 dark:hover:text-slate-200'
        }`;
    if (to) {
        return (
            <Link to={to} className={className}>
                {content}
            </Link>
        );
    }
    return (
        <a href="#" className={className}>
            {content}
        </a>
    );
};

const DashboardLayout = ({ children, title = "Dashboard" }) => {
    const { logout, user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    // Feedback State
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackForm, setFeedbackForm] = useState({ title: "", description: "" });
    const [feedbackImages, setFeedbackImages] = useState([]);
    const [submittingFeedback, setSubmittingFeedback] = useState(false);

    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') || 'light';
        }
        return 'light';
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
    };

    const userInitials = user?.user_name
        ? user.user_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : 'U';

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-dark-bg font-poppins text-slate-900 dark:text-white transition-colors duration-300">
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-dark-bg border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:flex-col shadow-xl md:shadow-sm
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 font-bold text-xl text-indigo-600 dark:text-indigo-400">
                        <img src="/images/SSR_Logo.png" alt="MANO" className="w-8 h-8" />
                        <span>SSR Logistics</span>
                    </div>
                    <button
                        className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>
                <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                    <SidebarItem icon={<LayoutDashboard size={20} />} text="Dashboard" to="/" />
                    <SidebarItem icon={<FileText size={20} />} text="Quotation" to="/quotation" />
                    <SidebarItem icon={<Briefcase size={20} />} text="Bookings" to="/bookings" />
                    <SidebarItem icon={<FileText size={20} />} text="DO / FC" to="/do-fc" />
                    <SidebarItem icon={<Anchor size={20} />} text="IGM" to="/igm" />
                    <SidebarItem icon={<FileText size={20} />} text="Invoice" to="/invoice" />
                    <SidebarItem icon={<ShieldCheck size={20} />} text="KYC" to="/kyc" />

                    {user?.role === 'Admin' && (
                        <SidebarItem icon={<Users size={20} />} text="Users" to="/users" />
                    )}
                </nav>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                        onClick={() => setShowFeedback(true)}
                        className="flex items-center gap-3 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors w-full px-4 py-2 text-sm font-medium">
                        <Bug size={18} />
                        Bugs & Feedback
                    </button>
                </div>
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden relative w-full">
                <header className="h-16 bg-white dark:bg-dark-bg border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-10 z-10 shadow-sm shrink-0 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <button
                            className="md:hidden p-2 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu size={20} />
                        </button>
                        <h1 className="text-xl font-semibold text-slate-800 dark:text-white hidden sm:block">{title}</h1>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6">
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                        <div className="relative">
                            <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" />
                        </div>
                        <div
                            className="relative flex items-center gap-3 pl-4 sm:pl-6 border-l border-slate-200 dark:border-slate-700 cursor-pointer"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                        >
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{user?.user_name || 'Guest'}</p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold border-2 border-white dark:border-slate-700 shadow-sm">
                                {userInitials}
                            </div>
                            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />

                            {/* Dropdown Menu */}
                            {isProfileOpen && (
                                <div className="absolute top-12 right-0 w-48 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 md:hidden">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{user?.user_name || 'Guest'}</p>
                                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                    </div>
                                    <Link
                                        to="/profile"
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <UserCircle size={16} />
                                        My Profile
                                    </Link>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent re-triggering parent click
                                            logout();
                                        }}
                                        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <LogOut size={16} />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50/50 dark:bg-dark-bg transition-colors duration-300">
                    {children}
                </main>
            </div>
            {/* Feedback Modal */}
            {showFeedback && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowFeedback(false)}>
                    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Bug className="text-indigo-600 dark:text-indigo-400" size={24} />
                                Report a Bug / Feedback
                            </h3>
                            <button onClick={() => setShowFeedback(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title / Subject</label>
                                <input
                                    type="text"
                                    value={feedbackForm.title}
                                    onChange={e => setFeedbackForm({ ...feedbackForm, title: e.target.value })}
                                    placeholder="Brief summary of the issue..."
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                                <textarea
                                    value={feedbackForm.description}
                                    onChange={e => setFeedbackForm({ ...feedbackForm, description: e.target.value })}
                                    placeholder="Please describe the bug or feedback in detail..."
                                    rows={4}
                                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Screenshots</label>
                                <div className="flex flex-wrap gap-4">
                                    {feedbackImages.map((img, idx) => (
                                        <div key={idx} className="relative w-20 h-20 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden group">
                                            <img src={URL.createObjectURL(img)} alt="preview" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setFeedbackImages(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-indigo-500">
                                        <Upload size={20} />
                                        <span className="text-[10px] mt-1">Upload</span>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => {
                                                if (e.target.files?.length) {
                                                    setFeedbackImages(prev => [...prev, ...Array.from(e.target.files)]);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setSubmittingFeedback(true);
                                    // Simulate API call
                                    setTimeout(() => {
                                        setSubmittingFeedback(false);
                                        setShowFeedback(false);
                                        setFeedbackForm({ title: '', description: '' });
                                        setFeedbackImages([]);
                                        alert("Feedback Submitted Successfully!");
                                    }, 1500);
                                }}
                                disabled={submittingFeedback || !feedbackForm.title}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;
