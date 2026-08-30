import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './Context/Authcontext.jsx';
import AuthModal from './Components/Auth/AuthModal.jsx';
import Sidebar from './Components/Chat/Sidebar.jsx';
import ChatWindow from './Components/Chat/Chatwindow.jsx';
import ProfileModal from './Components/Profile/ProfileModal.jsx';
import { useWebSocket } from './hooks/useWebsocket.js';
import api from './api/client.js';
import { playNotificationSound } from './utils/sound.js';
import {
  LogOut,
  MessageSquare,
  Menu,
  X,
  Settings
} from 'lucide-react';

const PAGE_SIZE = 30;

function App() {
  const { user, logout } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mobileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target)) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    lastEvent,
    onlineUsers,
    typingUsers,
    sendMessage,
    sendReadReceipt,
    sendTyping,
    deleteMessage,
  } = useWebSocket();

  // Chat open hone par messages load karein
  useEffect(() => {
    if (!selectedUser) return;

    // Reset unread count for this user
    setUnreadCounts((prev) => ({
      ...prev,
      [Number(selectedUser.id)]: 0,
    }));

    const loadInitialChat = async () => {
      try {
        const res = await api.get(`/messages/user/${selectedUser.id}?skip=0&limit=${PAGE_SIZE}`);
        setChatMessages(res.data);
        setHasMore(res.data.length >= PAGE_SIZE);
        sendReadReceipt(selectedUser.id);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };

    loadInitialChat();
  }, [selectedUser, sendReadReceipt]);

  // Load older messages
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || !selectedUser) return;

    try {
      setLoadingMore(true);
      const skip = chatMessages.length;
      const res = await api.get(`/messages/user/${selectedUser.id}?skip=${skip}&limit=${PAGE_SIZE}`);

      if (res.data.length < PAGE_SIZE) {
        setHasMore(false);
      }

      setChatMessages((prev) => [...res.data, ...prev]);
    } catch (err) {
      console.error('Failed to load more messages:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Real-time Event Listener (Strict Number Casting)
  useEffect(() => {
    if (!lastEvent) return;

    // 1. Delete Event
    if (lastEvent.type === 'message_deleted') {
      setChatMessages((prev) =>
        prev.filter((m) => Number(m.id) !== Number(lastEvent.message_id))
      );
      return;
    }

    // 2. Read Ack -> Blue Ticks for Sender
    if (lastEvent.type === 'read_ack') {
      const readerId = Number(lastEvent.reader_id);
      const readIds = lastEvent.message_ids ? lastEvent.message_ids.map(Number) : null;

      if (selectedUser && Number(selectedUser.id) === readerId) {
        setChatMessages((prev) =>
          prev.map((m) => {
            if (Number(m.sender_id) === Number(user?.id)) {
              if (!readIds || readIds.includes(Number(m.id))) {
                return { ...m, is_read: true, is_delivered: true };
              }
            }
            return m;
          })
        );
      }
      return;
    }

    // 3. Delivery Ack -> Double Grey Tick
    if (lastEvent.type === 'delivery_ack') {
      const targetMsgId = Number(lastEvent.message_id);
      setChatMessages((prev) =>
        prev.map((m) =>
          Number(m.id) === targetMsgId ? { ...m, is_delivered: true } : m
        )
      );
      return;
    }

    // 4. Live Chat Message
    if (lastEvent.type === 'chat') {
      const senderId = Number(lastEvent.sender_id);
      const receiverId = Number(lastEvent.receiver_id);
      const currentUserId = Number(user?.id);
      const isFromMe = senderId === currentUserId;

      const isCurrentActiveChat =
        selectedUser &&
        (senderId === Number(selectedUser.id) || receiverId === Number(selectedUser.id));

      // Sound Notification: Jab bhi doosre user ka message aaye
      if (!isFromMe) {
        playNotificationSound();
      }

      if (isCurrentActiveChat) {
        setChatMessages((prev) => {
          const exists = prev.some(
            (m) =>
              Number(m.id) === Number(lastEvent.id) ||
              (m.is_temp && m.content === lastEvent.content && Number(m.sender_id) === senderId)
          );

          if (exists) {
            return prev.map((m) =>
              Number(m.id) === Number(lastEvent.id) ||
                (m.is_temp && m.content === lastEvent.content && Number(m.sender_id) === senderId)
                ? lastEvent
                : m
            );
          }
          return [...prev, lastEvent];
        });

        // Agar active chat me naya message aaya toh turant Read Receipt trigger karein
        if (!isFromMe && selectedUser) {
          sendReadReceipt(selectedUser.id);
        }
      } else if (!isFromMe) {
        // Agar doosre user ka message hai aur chat closed hai -> Unread Count increment
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }
    }
  }, [lastEvent, selectedUser, user?.id, sendReadReceipt]);

  const handleSendMessage = (content, attachment = null) => {
    if (!selectedUser) return;

    // Optimistic UI Send
    const tempMsg = {
      id: Date.now(),
      sender_id: Number(user.id),
      receiver_id: Number(selectedUser.id),
      content: content || '',
      attachment_url: attachment?.attachment_url || attachment?.url || null,
      file_type: attachment?.file_type || null,
      file_name: attachment?.file_name || null,
      created_at: new Date().toISOString(),
      is_read: false,
      is_delivered: false,
      is_temp: true,
    };

    setChatMessages((prev) => [...prev, tempMsg]);
    sendMessage(selectedUser.id, content, attachment);
  };

  const handleDeleteMessage = (msgId) => {
    if (!selectedUser) return;
    deleteMessage(msgId, selectedUser.id);
  };

  if (!user) {
    return <AuthModal />;
  }

  return (
    <div className="h-[100dvh] w-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Top Navbar */}
      <header
        className={`h-14 border-b border-slate-800/90 bg-slate-900/60 backdrop-blur-md px-4 md:px-6 items-center justify-between shrink-0 z-20 relative ${selectedUser ? 'hidden md:flex' : 'flex'
          }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg border border-indigo-500/20 shadow-xs">
            <MessageSquare className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm tracking-wide text-slate-100">ChatMate</span>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs transition-all cursor-pointer shadow-xs"
            title="Profile Settings"
          >
            <div className="w-6 h-6 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center text-indigo-400 font-bold text-[11px] shrink-0 border border-slate-600/50">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user.username.charAt(0).toUpperCase()
              )}
            </div>
            <span className="text-slate-200 font-medium truncate max-w-[120px]">{user.username}</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Actions */}
        <div className="flex md:hidden items-center gap-2.5">
          <button
            onClick={() => setIsProfileOpen(true)}
            className="w-8 h-8 rounded-full overflow-hidden bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0 cursor-pointer"
            title="Open Profile"
          >
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </button>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white bg-slate-800/80 border border-slate-700/60 rounded-xl transition-colors cursor-pointer"
            title="Menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="absolute top-16 right-4 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1.5 animate-msg"
          >
            <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0 border border-slate-700">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user.username}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email || 'Online'}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                setIsProfileOpen(true);
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/70 transition-colors w-full text-left cursor-pointer"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Profile Settings</span>
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                logout();
              }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors w-full text-left cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className={`h-full w-full md:w-80 shrink-0 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
          <Sidebar
            selectedUser={selectedUser}
            onSelectUser={setSelectedUser}
            onlineUsers={onlineUsers}
            unreadCounts={unreadCounts}
          />
        </div>

        <div className={`h-full flex-1 ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
          <ChatWindow
            selectedUser={selectedUser}
            currentUser={user}
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onDeleteMessage={handleDeleteMessage}
            isTyping={selectedUser ? !!typingUsers[selectedUser.id] : false}
            onTyping={(isTyping) => selectedUser && sendTyping(selectedUser.id, isTyping)}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onBack={() => setSelectedUser(null)}
          />
        </div>
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}

export default App;