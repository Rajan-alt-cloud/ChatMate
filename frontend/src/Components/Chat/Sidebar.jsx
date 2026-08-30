import React, { useState, useEffect } from 'react';
import { Users, Search, X } from 'lucide-react';
import api from '../../api/client';

export default function Sidebar({
    selectedUser,
    onSelectUser,
    onlineUsers = [],
    unreadCounts = {},
}) {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.get('/users');
                setUsers(res.data);
            } catch (err) {
                console.error('Failed to fetch users:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Filter users by username or email
    const filteredUsers = users.filter((u) =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="w-80 border-r border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex flex-col h-full shrink-0 select-none">
            {/* Search Header */}
            <div className="p-4 border-b border-slate-800/80 shrink-0">
                <div className="relative flex items-center">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-950/80 border border-slate-800/90 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-slate-200 text-xs rounded-xl pl-10 pr-8 py-2.5 outline-none transition-all placeholder:text-slate-600"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 p-1 text-slate-500 hover:text-slate-300 rounded-md transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-2">
                        <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
                        <span className="text-xs">Loading contacts...</span>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-1 text-center px-4">
                        <Users className="w-8 h-8 stroke-1 text-slate-600 mb-1" />
                        <p className="text-xs font-medium text-slate-400">No conversations found</p>
                        <p className="text-[11px] text-slate-600">Try searching for a different username</p>
                    </div>
                ) : (
                    filteredUsers.map((u) => {
                        const isOnline = onlineUsers.includes(u.id);
                        const isSelected = selectedUser?.id === u.id;
                        const unreadCount = unreadCounts[u.id] || 0;

                        return (
                            <button
                                key={u.id}
                                onClick={() => onSelectUser(u)}
                                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all text-left cursor-pointer border ${isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-500/40 shadow-lg shadow-indigo-600/20'
                                        : 'border-transparent hover:bg-slate-800/50 hover:border-slate-800 text-slate-300'
                                    }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Avatar (Photo or Fallback Initial) */}
                                    <div className="relative shrink-0">
                                        <div
                                            className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm border transition-colors ${isSelected
                                                    ? 'bg-indigo-700/80 border-indigo-400 text-white'
                                                    : 'bg-slate-800 border-slate-700/70 text-indigo-400'
                                                }`}
                                        >
                                            {u.avatar_url ? (
                                                <img
                                                    src={u.avatar_url}
                                                    alt={u.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                u.username.charAt(0).toUpperCase()
                                            )}
                                        </div>

                                        {/* Online Dot */}
                                        {isOnline && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full ring-1 ring-emerald-500/40"></span>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="min-w-0">
                                        <h4
                                            className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-200'
                                                }`}
                                        >
                                            {u.username}
                                        </h4>
                                        <p
                                            className={`text-xs truncate ${isSelected ? 'text-indigo-200' : 'text-slate-500'
                                                }`}
                                        >
                                            {isOnline ? (
                                                <span className={isSelected ? 'text-emerald-300 font-medium' : 'text-emerald-400 font-medium'}>
                                                    Online
                                                </span>
                                            ) : (
                                                u.email || 'Offline'
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {/* Unread Message Count Badge */}
                                {unreadCount > 0 && !isSelected && (
                                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse shrink-0 ml-2">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
}