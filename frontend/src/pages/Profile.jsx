import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { Camera, Mail, Phone, Briefcase, User, MapPin, Building, Eye, EyeOff, Lock, CheckCircle2 } from 'lucide-react';

const Profile = () => {
    const { user } = useAuth();
    const [showPassword, setShowPassword] = useState(false);

    // Mock data based on screenshot if user object misses fields
    // Ideally these would come from the backend or user object
    const profileData = {
        name: user?.user_name || "Admin",
        role: user?.user_role || "Admin", // Assuming user object availability
        email: user?.email || "admin@demo.com",
        phone: user?.phone || "5",
        department: "Engineering",
        employeeCode: "DEMO-001",
        avatar: "/images/avatar-placeholder.png",
        isActive: true, // Mock active status
        password: "password123" // Mock password for display
    };

    const userInitials = profileData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

    return (
        <DashboardLayout title="My Profile">
            <div className="flex flex-col gap-6 max-w-5xl mx-auto">

                {/* Top Profile Card */}
                <div className="bg-white dark:bg-dark-card rounded-2xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-slate-500 dark:text-slate-400 overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg">
                            {/* If we had an image URL: <img src={src} ... /> else initials */}
                            {userInitials}
                        </div>
                        <button className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full border-4 border-white dark:border-dark-card shadow-md transition-transform hover:scale-105">
                            <Camera size={18} />
                        </button>
                    </div>

                    <div className="flex-1 text-center md:text-left pt-2">
                        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">{profileData.name}</h2>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-medium border border-indigo-100 dark:border-indigo-800">
                            <User size={14} />
                            {profileData.role}
                        </span>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Contact Information */}
                    <div className="bg-white dark:bg-dark-card rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Contact Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500">
                                    <Mail size={20} />
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-slate-500 font-medium mb-0.5">Email Address</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{profileData.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500">
                                    <Phone size={20} />
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-slate-500 font-medium mb-0.5">Phone Number</p>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{profileData.phone}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account Security Section */}
                    <div className="bg-white dark:bg-dark-card rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Account Security</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500">
                                    <Lock size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs uppercase text-slate-500 font-medium mb-0.5">Password</p>
                                    <div className="flex items-center justify-between gap-2 max-w-xs">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={profileData.password}
                                            readOnly
                                            className="text-sm font-semibold text-slate-800 dark:text-white bg-transparent outline-none w-full"
                                        />
                                        <button onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-indigo-600 transition-colors">
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${profileData.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-50 text-slate-500'}`}>
                                    <CheckCircle2 size={20} />
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-slate-500 font-medium mb-0.5">Account Status</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">Active User</p>
                                        {profileData.isActive && (
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
};

export default Profile;
