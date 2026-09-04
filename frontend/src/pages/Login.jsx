import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAuth } from "../context/AuthContext";
import { User, Lock, Eye, EyeOff, ShieldCheck, Globe, ArrowRight, KeyRound, Mail, AlertTriangle, RefreshCw } from "lucide-react";

const Login = () => {
    const [loginMode, setLoginMode] = useState("password"); // "password" | "otp"
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [otpCountdown, setOtpCountdown] = useState(0);
    const [logoError, setLogoError] = useState(false);
    
    const navigate = useNavigate();
    const { login, sendOTP, verifyOTP } = useAuth();

    // Standard Password Login
    const handlePasswordLogin = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error("Please enter your registered email address.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            toast.error("Please enter a valid email format.");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        try {
            await login(email.trim(), password);
            toast.success("Login successful!");
            navigate("/");
        } catch (err) {
            if (err.passwordExpired) {
                toast.error(err.message, { autoClose: 7000 });
                // Prompt user to switch to OTP login or reset password
                setLoginMode("otp");
            } else {
                toast.error(err.message || "Invalid email or password.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Request OTP to registered email
    const handleRequestOTP = async () => {
        if (!email.trim()) {
            toast.error("Please enter your registered email address first.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            toast.error("Please enter a valid email address.");
            return;
        }

        setLoading(true);
        try {
            const res = await sendOTP(email.trim());
            toast.success(res.message || "OTP sent to your registered email.");
            setOtpSent(true);
            setOtpCountdown(60);

            const timer = setInterval(() => {
                setOtpCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            toast.error(err.message || "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    // Verify OTP Login
    const handleOTPLogin = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error("Please enter your registered email address.");
            return;
        }

        if (!otp.trim() || otp.trim().length !== 6) {
            toast.error("Please enter the 6-digit OTP sent to your email.");
            return;
        }

        setLoading(true);
        try {
            await verifyOTP(email.trim(), otp.trim());
            toast.success("OTP verified successfully!");
            navigate("/");
        } catch (err) {
            toast.error(err.message || "Invalid or expired OTP.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0e1029] to-[#070918] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-poppins selection:bg-indigo-600 selection:text-white relative">
            
            {/* Subtle Ambient Background Mesh */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Split Container */}
            <div className="w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] overflow-hidden flex flex-col md:flex-row border border-slate-800/50 relative z-10 min-h-[620px]">
                
                {/* Left Brand Panel */}
                <div className="w-full md:w-1/2 bg-gradient-to-b from-[#141638] via-[#101230] to-[#0a0b1f] text-white p-8 sm:p-10 flex flex-col justify-between relative border-b md:border-b-0 md:border-r border-indigo-950/60">
                    
                    {/* Top Status */}
                    <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/25 text-indigo-300 text-xs font-semibold tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            ERP Enterprise Portal
                        </div>
                    </div>

                    {/* Center Section: Logo & Software Title */}
                    <div className="py-6 my-auto text-center flex flex-col items-center">
                        
                        {/* High-Contrast Pure White Card for Logo Sharpness */}
                        <div className="relative bg-white rounded-2xl p-4 shadow-xl border-2 border-white/90 flex items-center justify-center mb-6 w-44 h-24 transition-transform duration-300 hover:scale-105">
                            {!logoError ? (
                                <img
                                    src="/images/SSR_nobg.webp"
                                    alt="SSR Logistic Solutions Logo"
                                    className="max-w-full max-h-full object-contain"
                                    onError={() => setLogoError(true)}
                                />
                            ) : (
                                <div className="flex items-center gap-2 text-[#141638] font-black text-xl">
                                    <ShieldCheck className="w-8 h-8 text-indigo-700" />
                                    <span>SSR LOGISTIC</span>
                                </div>
                            )}
                        </div>

                        {/* Title & Subtitle */}
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-white uppercase font-poppins">
                            ERP WEBSITE
                        </h1>
                        <p className="text-indigo-200/80 text-xs sm:text-sm font-medium mt-1.5 tracking-wide">
                            Freight & Logistics Management Software
                        </p>
                    </div>

                    {/* Bottom Company & Address Information */}
                    <div className="pt-6 border-t border-indigo-900/50 text-center space-y-1.5">
                        <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase">
                            SSR LOGISTIC SOLUTIONS PVT LTD
                        </h2>
                        <p className="text-[11px] sm:text-xs text-indigo-200/75 leading-relaxed max-w-sm mx-auto font-normal">
                            Office No. 612, Plot No.16, 6th Floor, Vashi Infotech Park,<br />
                            Sector - 30 A, Near Raghuleela Mall, Vashi, Navi Mumbai - 400 703
                        </p>
                        <div className="pt-1 flex items-center justify-center gap-1.5 text-xs text-indigo-300">
                            <Globe size={13} className="text-indigo-400 shrink-0" />
                            <span>Website:</span>
                            <a
                                href="https://www.ssrlogistic.net"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-200 hover:text-white underline underline-offset-2 transition-colors font-medium"
                            >
                                www.ssrlogistic.net
                            </a>
                        </div>
                    </div>
                </div>

                {/* Right Form Panel */}
                <div className="w-full md:w-1/2 bg-white p-8 sm:p-10 flex flex-col justify-between">
                    
                    {/* Header & Mode Switcher */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                                    LOGIN
                                </h2>
                                <div className="w-8 h-1 bg-[#141638] mt-1 rounded-full"></div>
                            </div>

                            {/* Authentication Mode Toggle */}
                            <div className="flex p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                                <button
                                    type="button"
                                    onClick={() => setLoginMode("password")}
                                    className={`px-3 py-1.5 rounded-lg transition-all ${
                                        loginMode === "password"
                                            ? "bg-white text-[#141638] shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    Password
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setLoginMode("otp")}
                                    className={`px-3 py-1.5 rounded-lg transition-all ${
                                        loginMode === "otp"
                                            ? "bg-white text-[#141638] shadow-sm"
                                            : "text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    Email OTP
                                </button>
                            </div>
                        </div>

                        {/* Mandatory Password Security Notice Banner */}
                        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-slate-700 text-[11px] leading-relaxed mb-4">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-bold text-amber-900">Password Security: </span>
                                Your password is valid for 60 days only. After 60 days you must validate your old password using an otp which will be sent to your registered mail id. You can then login with your old password.
                            </div>
                        </div>
                    </div>

                    {/* Mode 1: Standard Password Form */}
                    {loginMode === "password" ? (
                        <form onSubmit={handlePasswordLogin} className="space-y-4 my-auto">
                            {/* Email Field */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Registered Email Address
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                                        <Mail size={17} />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm font-medium focus:bg-white focus:border-[#141638] focus:ring-2 focus:ring-indigo-900/10 focus:outline-none transition-all"
                                        placeholder="name@company.com"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Password
                                    </label>
                                    <Link
                                        to="/forgot-password"
                                        className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline transition-colors"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative flex items-center">
                                    <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                                        <Lock size={17} />
                                    </div>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm font-medium focus:bg-white focus:border-[#141638] focus:ring-2 focus:ring-indigo-900/10 focus:outline-none transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 bg-[#141638] hover:bg-[#1f2257] active:scale-[0.99] text-white font-semibold tracking-wider text-sm rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 uppercase flex items-center justify-center gap-2 group"
                                >
                                    <span>{loading ? "AUTHENTICATING..." : "SIGN IN"}</span>
                                    {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
                                </button>
                            </div>
                        </form>
                    ) : (
                        /* Mode 2: Email OTP Login Form */
                        <form onSubmit={handleOTPLogin} className="space-y-4 my-auto">
                            {/* Email Field */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Registered Email Address
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1 flex items-center">
                                        <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                                            <Mail size={17} />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm font-medium focus:bg-white focus:border-[#141638] focus:ring-2 focus:ring-indigo-900/10 focus:outline-none transition-all"
                                            placeholder="name@company.com"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleRequestOTP}
                                        disabled={loading || otpCountdown > 0}
                                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl shadow-sm disabled:opacity-50 whitespace-nowrap transition-all flex items-center gap-1.5"
                                    >
                                        {otpCountdown > 0 ? (
                                            `Resend (${otpCountdown}s)`
                                        ) : (
                                            <>
                                                <RefreshCw size={13} />
                                                <span>{otpSent ? "Resend OTP" : "Send OTP"}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* OTP Code Field */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                                    Enter 6-Digit Email OTP
                                </label>
                                <div className="relative flex items-center">
                                    <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                                        <KeyRound size={17} />
                                    </div>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 tracking-widest text-center text-lg font-bold placeholder-slate-300 focus:bg-white focus:border-[#141638] focus:ring-2 focus:ring-indigo-900/10 focus:outline-none transition-all"
                                        placeholder="••••••"
                                        required
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">
                                    OTP is sent directly to your registered company email and is valid for 10 minutes.
                                </p>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading || !otpSent || otp.length !== 6}
                                    className="w-full py-3 bg-[#141638] hover:bg-[#1f2257] active:scale-[0.99] text-white font-semibold tracking-wider text-sm rounded-xl shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 uppercase flex items-center justify-center gap-2 group"
                                >
                                    <span>{loading ? "VERIFYING OTP..." : "VERIFY & LOGIN"}</span>
                                    {!loading && <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Footer / Security Note */}
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                            <ShieldCheck size={14} className="text-emerald-600" />
                            256-Bit SSL Encrypted
                        </span>
                        <span>Authorized Personnel Only</span>
                    </div>

                </div>
            </div>

            <ToastContainer position="top-right" autoClose={3500} theme="colored" />
        </div>
    );
};

export default Login;
