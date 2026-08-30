import React, { useState } from 'react';
import { useAuth } from '../../Context/Authcontext';
import {
    MessageSquare,
    Lock,
    User,
    Mail,
    ArrowRight,
    Loader2,
    Eye,
    EyeOff,
    AlertCircle,
    Sparkles
} from 'lucide-react';

export default function AuthModal() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const { login, register, loading } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (isLogin) {
            const res = await login(username, password);
            if (!res.success) {
                setErrorMsg(res.message || 'Invalid username or password.');
            }
        } else {
            if (!email.trim()) {
                setErrorMsg('Email address is required for registration.');
                return;
            }
            const res = await register(username, email, password);
            if (!res.success) {
                setErrorMsg(res.message || 'Registration failed. Please try again.');
            }
        }
    };

    return (
        <div className="min-h-screen w-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden select-none">
            {/* Background Glowing Ambient Orbs */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Main Glass Card */}
            <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-black/60 relative z-10 space-y-6 animate-msg">

                {/* Header Icon & Title */}
                <div className="text-center space-y-2">
                    <div className="inline-flex p-3 bg-gradient-to-tr from-indigo-600/20 to-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/30 mb-1 shadow-inner">
                        <MessageSquare className="w-7 h-7 stroke-[2]" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center justify-center gap-1.5">
                        <span>{isLogin ? 'Welcome Back' : 'Create Account'}</span>
                        {!isLogin && <Sparkles className="w-4 h-4 text-indigo-400" />}
                    </h2>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                        {isLogin
                            ? 'Enter your credentials to access your real-time chats'
                            : 'Sign up to connect and share files instantly'}
                    </p>
                </div>

                {/* Error Alert Box */}
                {errorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs rounded-xl flex items-center gap-2.5 animate-msg">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span className="font-medium">{errorMsg}</span>
                    </div>
                )}

                {/* Auth Form */}
                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Username Input */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                            Username
                        </label>
                        <div className="relative flex items-center">
                            <User className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                            <input
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="e.g. alex_dev"
                                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    {/* Email Input (Register Only) */}
                    {!isLogin && (
                        <div className="animate-msg">
                            <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                                Email Address
                            </label>
                            <div className="relative flex items-center">
                                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="alex@example.com"
                                    className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 outline-none transition-all placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                    )}

                    {/* Password Input with Show/Hide Toggle */}
                    <div>
                        <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1.5 ml-1">
                            Password
                        </label>
                        <div className="relative flex items-center">
                            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 text-white text-sm rounded-xl pl-10 pr-10 py-2.5 outline-none transition-all placeholder:text-slate-600"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 mt-3 cursor-pointer"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Switch Between Sign In / Sign Up */}
                <div className="text-center pt-1 border-t border-slate-800/60">
                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setErrorMsg('');
                        }}
                        className="text-xs text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer mt-3"
                    >
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <span className="text-indigo-400 font-semibold hover:underline underline-offset-4">
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </span>
                    </button>
                </div>

            </div>
        </div>
    );
}