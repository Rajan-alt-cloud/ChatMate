import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../Context/Authcontext';

export const useWebSocket = () => {
    const { token, user } = useAuth();
    const socketRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [lastEvent, setLastEvent] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState({});

    useEffect(() => {
        if (!token || !user) return;

        const wsUrl = `ws://127.0.0.1:8000/ws?token=${token}`;
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket Connected');
            setIsConnected(true);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                // Global status updates
                if (data.type === 'online_users') {
                    setOnlineUsers(data.users || []);
                } else if (data.type === 'status') {
                    if (data.status === 'online') {
                        setOnlineUsers((prev) => [...new Set([...prev, data.user_id])]);
                    } else if (data.status === 'offline') {
                        setOnlineUsers((prev) => prev.filter((id) => id !== data.user_id));
                    }
                } else if (data.type === 'typing') {
                    setTypingUsers((prev) => ({
                        ...prev,
                        [data.sender_id]: data.is_typing,
                    }));
                }

                // Pass every event with unique timestamp to App.jsx
                setLastEvent({ ...data, _time: Date.now() });
            } catch (err) {
                console.error('WebSocket parse error:', err);
            }
        };

        ws.onerror = (error) => console.error('WebSocket Error:', error);
        ws.onclose = () => setIsConnected(false);

        return () => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.close();
            } else {
                ws.onopen = () => ws.close();
            }
        };
    }, [token, user]);

    // Send message
    const sendMessage = useCallback((receiverId, content = '', attachment = null) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            const payload = {
                receiver_id: receiverId,
                content: content || '',
                attachment_url: attachment?.attachment_url || attachment?.url || null,
                file_type: attachment?.file_type || null,
                file_name: attachment?.file_name || null,
            };
            socketRef.current.send(JSON.stringify(payload));
            return true;
        }
        return false;
    }, []);

    // Send read receipt
    const sendReadReceipt = useCallback((senderId) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ type: 'read', sender_id: senderId }));
        }
    }, []);

    // Send typing indicator
    const sendTyping = useCallback((receiverId, isTyping) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(
                JSON.stringify({
                    type: 'typing',
                    receiver_id: receiverId,
                    is_typing: isTyping,
                })
            );
        }
    }, []);

    // Delete message
    const deleteMessage = useCallback((messageId, receiverId) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(
                JSON.stringify({
                    type: 'delete',
                    message_id: messageId,
                    receiver_id: receiverId,
                })
            );
        }
    }, []);

    return {
        isConnected,
        lastEvent,
        onlineUsers,
        typingUsers,
        sendMessage,
        sendReadReceipt,
        sendTyping,
        deleteMessage,
    };
}; 