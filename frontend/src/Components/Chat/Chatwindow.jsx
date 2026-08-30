import React, { useState, useEffect, useRef } from 'react';
import {
    Send,
    MessageSquare,
    Check,
    CheckCheck,
    Trash2,
    Paperclip,
    FileText,
    Download,
    Loader2,
    Smile,
    X,
    ExternalLink,
    ShieldCheck,
    ArrowLeft
} from 'lucide-react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import api from '../../api/client';

export default function ChatWindow({
    selectedUser,
    currentUser,
    messages,
    onSendMessage,
    onDeleteMessage,
    isTyping,
    onTyping,
    onLoadMore,
    hasMore,
    loadingMore,
    onBack,
}) {
    const [text, setText] = useState('');
    const [uploading, setUploading] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    const scrollContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const prevScrollHeightRef = useRef(0);
    const isInitialLoadRef = useRef(true);

    // Reset flag when switching conversation
    useEffect(() => {
        isInitialLoadRef.current = true;
    }, [selectedUser]);

    // Initial load auto-scroll to bottom
    useEffect(() => {
        if (isInitialLoadRef.current && messages.length > 0) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            isInitialLoadRef.current = false;
        } else if (!isInitialLoadRef.current && messages.length > 0) {
            const container = scrollContainerRef.current;
            if (container) {
                const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 250;
                if (isNearBottom) {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    }, [messages, selectedUser]);

    // Scroll Anchoring when older messages are loaded
    useEffect(() => {
        if (prevScrollHeightRef.current && scrollContainerRef.current) {
            const delta = scrollContainerRef.current.scrollHeight - prevScrollHeightRef.current;
            scrollContainerRef.current.scrollTop += delta;
            prevScrollHeightRef.current = 0;
        }
    }, [messages]);

    const handleScroll = () => {
        if (!scrollContainerRef.current || loadingMore || !hasMore) return;

        if (scrollContainerRef.current.scrollTop === 0) {
            prevScrollHeightRef.current = scrollContainerRef.current.scrollHeight;
            if (onLoadMore) onLoadMore();
        }
    };

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e) => {
        setText(e.target.value);
        if (onTyping) {
            onTyping(true);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = setTimeout(() => {
                onTyping(false);
            }, 1500);
        }
    };

    const handleEmojiClick = (emojiData) => {
        setText((prev) => prev + emojiData.emoji);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim() && !uploading) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (onTyping) onTyping(false);

        onSendMessage(text, null);
        setText('');
        setShowEmojiPicker(false);

        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            setUploading(true);
            const res = await api.post('/upload', formData);

            onSendMessage('', res.data);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
        } catch (err) {
            console.error('File upload failed:', err);
            alert('Failed to upload file.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const formatTime = (msg) => {
        const rawTime = msg.created_at || msg.timestamp;
        if (!rawTime) return 'Just now';
        const date = new Date(rawTime);
        if (isNaN(date.getTime())) return 'Just now';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDateSeparator = (dateString) => {
        if (!dateString) return 'Today';
        const msgDate = new Date(dateString);
        if (isNaN(msgDate.getTime())) return 'Today';

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        const isSameDay = (d1, d2) =>
            d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();

        if (isSameDay(msgDate, today)) return 'Today';
        if (isSameDay(msgDate, yesterday)) return 'Yesterday';

        return msgDate.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderMessageStatus = (msg) => {
        if (msg.is_read) return <CheckCheck className="w-3.5 h-3.5 text-sky-400" />;
        if (msg.is_delivered) return <CheckCheck className="w-3.5 h-3.5 text-indigo-200/70" />;
        return <Check className="w-3.5 h-3.5 text-indigo-200/70" />;
    };

    if (!selectedUser) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-500 p-8 select-none">
                <div className="w-20 h-20 rounded-3xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5 shadow-2xl shadow-indigo-500/10">
                    <MessageSquare className="w-9 h-9 stroke-[1.5]" />
                </div>
                <h2 className="text-lg font-bold text-slate-200 mb-1">Your Messages</h2>
                <p className="text-xs text-slate-500 text-center max-w-xs leading-relaxed">
                    Select a user from the left sidebar to start real-time conversation or share files.
                </p>
                <div className="flex items-center gap-1.5 mt-6 text-[11px] text-slate-600 font-medium bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>End-to-End Real-Time Connection</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full w-full bg-slate-950 relative overflow-hidden">
            {/* 
        Chat Header (Mobile & Desktop)
        - Profile photo with proper shrink-0 so it never disappears on mobile
      */}
            <div className="h-16 px-3 md:px-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0 z-10">
                <div className="flex items-center gap-2.5 min-w-0">
                    {/* Mobile Back Button */}
                    <button
                        onClick={onBack}
                        className="md:hidden p-1.5 -ml-1 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                        title="Back to contacts"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    {/* User Profile Avatar */}
                    <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-700/80 flex items-center justify-center text-indigo-400 font-bold text-sm shadow-md shadow-indigo-600/10">
                            {selectedUser.avatar_url ? (
                                <img
                                    src={selectedUser.avatar_url}
                                    alt={selectedUser.username}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                        // Fallback to text initial if image fails
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerText = selectedUser.username?.charAt(0).toUpperCase();
                                    }}
                                />
                            ) : (
                                selectedUser.username?.charAt(0).toUpperCase()
                            )}
                        </div>
                    </div>

                    {/* User Name & Status */}
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-100 truncate">
                            {selectedUser.username}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">
                            {isTyping ? (
                                <span className="text-indigo-400 font-medium animate-pulse">typing...</span>
                            ) : (
                                selectedUser.email || 'Direct Message'
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Feed */}
            <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-3.5"
            >
                {loadingMore && (
                    <div className="flex justify-center py-2">
                        <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full flex items-center gap-2">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                            <span className="text-[11px] text-slate-400">Loading older messages...</span>
                        </div>
                    </div>
                )}

                {messages.map((msg, index) => {
                    const isMe = Number(msg.sender_id) === Number(currentUser.id);
                    const currentMsgDate = formatDateSeparator(msg.created_at || msg.timestamp);
                    const prevMsg = messages[index - 1];
                    const prevMsgDate = prevMsg
                        ? formatDateSeparator(prevMsg.created_at || prevMsg.timestamp)
                        : null;
                    const showDateSeparator = currentMsgDate !== prevMsgDate;

                    return (
                        <React.Fragment key={msg.id || index}>
                            {showDateSeparator && (
                                <div className="flex justify-center my-3">
                                    <span className="bg-slate-900/90 border border-slate-800 text-slate-400 text-[10px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full shadow-xs">
                                        {currentMsgDate}
                                    </span>
                                </div>
                            )}

                            <div className={`flex items-end gap-2 group animate-msg ${isMe ? 'justify-end' : 'justify-start'}`}>
                                {isMe && msg.id && (
                                    <button
                                        type="button"
                                        onClick={() => onDeleteMessage && onDeleteMessage(msg.id)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer mb-1"
                                        title="Delete message"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}

                                <div
                                    className={`max-w-[85%] md:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${isMe
                                            ? 'bg-indigo-600 text-white rounded-br-xs border border-indigo-500/30'
                                            : 'bg-slate-800/90 text-slate-200 rounded-bl-xs border border-slate-700/60'
                                        }`}
                                >
                                    {/* Image Attachment Preview */}
                                    {msg.attachment_url && msg.file_type === 'image' && (
                                        <div
                                            onClick={() => setPreviewImage(msg.attachment_url)}
                                            className="mb-2 overflow-hidden rounded-xl border border-white/10 relative group/img cursor-pointer max-w-sm"
                                        >
                                            <img
                                                src={msg.attachment_url}
                                                alt="Attachment"
                                                className="max-h-60 md:max-h-64 w-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                <ExternalLink className="w-5 h-5" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Document Attachment Box */}
                                    {msg.attachment_url && msg.file_type === 'file' && (
                                        <div className="mb-2 p-2.5 bg-black/20 backdrop-blur-xs rounded-xl flex items-center justify-between gap-3 border border-white/10">
                                            <div className="flex items-center gap-2.5 truncate">
                                                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300">
                                                    <FileText className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs truncate font-medium">{msg.file_name || 'Document'}</span>
                                            </div>
                                            <a
                                                href={msg.attachment_url}
                                                download
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 hover:bg-white/10 rounded-lg text-indigo-200 transition-colors shrink-0"
                                            >
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    )}

                                    {msg.content && <p className="break-words select-text">{msg.content}</p>}

                                    <div
                                        className={`flex items-center justify-end gap-1 mt-1 select-none ${isMe ? 'text-indigo-200/80' : 'text-slate-500'
                                            }`}
                                    >
                                        <span className="text-[10px]">{formatTime(msg)}</span>
                                        {isMe && renderMessageStatus(msg)}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}

                <div ref={messagesEndRef} />
            </div>

            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
                <div
                    ref={emojiPickerRef}
                    className="absolute bottom-20 left-4 md:left-6 z-50 shadow-2xl rounded-2xl overflow-hidden border border-slate-800 max-w-[90vw]"
                >
                    <EmojiPicker
                        theme={Theme.DARK}
                        onEmojiClick={handleEmojiClick}
                        autoFocusSearch={false}
                        width={300}
                        height={380}
                    />
                </div>
            )}

            {/* Image Lightbox */}
            {previewImage && (
                <div
                    onClick={() => setPreviewImage(null)}
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-msg"
                >
                    <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-5 right-5 p-2.5 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-full transition-all cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img
                        src={previewImage}
                        alt="Fullscreen preview"
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl border border-slate-800"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Input Bar */}
            <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t border-slate-800/80 bg-slate-900/40 backdrop-blur-md flex items-center gap-2 shrink-0">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                />

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 md:p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-xl transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    title="Attach file or photo"
                >
                    {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                    ) : (
                        <Paperclip className="w-5 h-5" />
                    )}
                </button>

                <button
                    type="button"
                    onClick={() => setShowEmojiPicker((prev) => !prev)}
                    className={`p-2 md:p-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${showEmojiPicker
                            ? 'text-indigo-400 bg-slate-800'
                            : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800'
                        }`}
                    title="Choose Emoji"
                >
                    <Smile className="w-5 h-5" />
                </button>

                <input
                    type="text"
                    value={text}
                    onChange={handleInputChange}
                    placeholder={`Message ${selectedUser?.username || ''}...`}
                    className="flex-1 bg-slate-950 border border-slate-800/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 text-white text-sm rounded-xl px-3 md:px-4 py-2.5 outline-none transition-all placeholder:text-slate-600 min-w-0"
                />

                <button
                    type="submit"
                    disabled={!text.trim() && !uploading}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3.5 md:px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center cursor-pointer shrink-0"
                >
                    <Send className="w-4 h-4" />
                </button>
            </form>
        </div>
    );
}