import React, { useState, useRef } from 'react';
import { X, Camera, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../Context/Authcontext';

export default function ProfileModal({ isOpen, onClose }) {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(user?.avatar_url || null);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Instant local preview
        const localUrl = URL.createObjectURL(file);
        setPreview(localUrl);

        const formData = new FormData();
        formData.append('file', file);

        try {
            setLoading(true);
            // NOTE: Manual headers mat bhejo, Axios automatic boundary set karega
            const res = await api.post('/users/me/avatar', formData);

            // Update AuthContext & localStorage
            updateUser(res.data);
        } catch (err) {
            console.error('Failed to upload avatar:', err.response?.data || err.message);
            alert(err.response?.data?.detail || 'Failed to update profile picture.');
            setPreview(user?.avatar_url || null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl relative animate-msg">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                    <X className="w-4 h-4" />
                </button>

                <h3 className="text-base font-bold text-slate-100 text-center mb-6">Profile Settings</h3>

                {/* Avatar Upload Area */}
                <div className="flex flex-col items-center">
                    <div
                        className="relative group cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-indigo-500/50 bg-slate-800 flex items-center justify-center shadow-xl shadow-indigo-600/10">
                            {preview ? (
                                <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-indigo-400">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>

                        {/* Camera Hover Overlay */}
                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            {loading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                            ) : (
                                <Camera className="w-6 h-6" />
                            )}
                        </div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>

                    <p className="text-xs text-slate-400 mt-3 font-medium">Click avatar to change picture</p>
                </div>

                {/* User Details */}
                <div className="mt-6 space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Username</label>
                        <p className="text-sm font-medium text-slate-200">{user?.username}</p>
                    </div>
                    <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email</label>
                        <p className="text-sm font-medium text-slate-200">{user?.email || 'No email attached'}</p>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                    Done
                </button>
            </div>
        </div>
    );
}