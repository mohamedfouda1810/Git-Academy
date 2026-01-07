import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatApi, ChatContactDto, ChatMessageDto, UserRole } from '../lib/api';
import { signalRService } from '../lib/signalr';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import { MessageCircle, Send, Search } from 'lucide-react';
import { format } from 'date-fns';

export function ChatPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [selectedContact, setSelectedContact] = useState<ChatContactDto | null>(null);
    const [message, setMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: contacts } = useQuery({
        queryKey: ['contacts'],
        queryFn: () => chatApi.getContacts(),
    });

    const { data: conversations } = useQuery({
        queryKey: ['conversations'],
        queryFn: () => chatApi.getConversations(),
    });

    const { data: messages, refetch: refetchMessages } = useQuery({
        queryKey: ['messages', selectedContact?.userId],
        queryFn: () => chatApi.getMessages(selectedContact!.userId),
        enabled: !!selectedContact,
    });

    const sendMutation = useMutation({
        mutationFn: (content: string) => chatApi.sendMessage({
            receiverId: selectedContact!.userId,
            content,
        }),
        onSuccess: () => {
            setMessage('');
            refetchMessages();
        },
    });

    // SignalR message listener
    useEffect(() => {
        const unsubscribe = signalRService.onMessage((msg: ChatMessageDto) => {
            if (selectedContact && (msg.senderId === selectedContact.userId || msg.receiverId === selectedContact.userId)) {
                refetchMessages();
            }
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        });

        return unsubscribe;
    }, [selectedContact, refetchMessages, queryClient]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Mark as read when selecting a contact
    useEffect(() => {
        if (selectedContact) {
            chatApi.markAsRead(selectedContact.userId);
        }
    }, [selectedContact]);

    const filteredContacts = contacts?.data.data?.filter(c =>
        c.userName.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (message.trim() && selectedContact) {
            sendMutation.mutate(message.trim());
        }
    };

    const getUnreadCount = (userId: string) => {
        const conv = conversations?.data.data?.find(c => c.userId === userId);
        return conv?.unreadCount || 0;
    };

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Messages</h1>
                <p className="page-subtitle">Chat with professors, TAs, and advisors</p>
            </div>

            <div className="chat-container">
                {/* Contacts Sidebar */}
                <div className="chat-sidebar">
                    <div style={{ padding: 16 }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{
                                position: 'absolute',
                                left: 12,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: 'var(--text-muted)'
                            }} />
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Search contacts..."
                                style={{ paddingLeft: 40 }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {filteredContacts.map(contact => {
                            const unreadCount = getUnreadCount(contact.userId);
                            return (
                                <div
                                    key={contact.userId}
                                    onClick={() => setSelectedContact(contact)}
                                    style={{
                                        padding: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        cursor: 'pointer',
                                        background: selectedContact?.userId === contact.userId ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                                        borderLeft: selectedContact?.userId === contact.userId ? '3px solid var(--primary)' : '3px solid transparent',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div className="avatar">
                                        {contact.userName.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 500 }}>{contact.userName}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {getRoleName(contact.userRole)}
                                        </div>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="badge badge-error">{unreadCount}</span>
                                    )}
                                </div>
                            );
                        })}

                        {filteredContacts.length === 0 && (
                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                                No contacts found
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Main Area */}
                <div className="chat-main">
                    {selectedContact ? (
                        <>
                            {/* Chat Header */}
                            <div style={{
                                padding: 16,
                                borderBottom: '1px solid var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12
                            }}>
                                <div className="avatar">{selectedContact.userName.split(' ').map(n => n[0]).join('')}</div>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{selectedContact.userName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {getRoleName(selectedContact.userRole)}
                                        {selectedContact.courseName && ` • ${selectedContact.courseName}`}
                                    </div>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="chat-messages">
                                {messages?.data.data?.slice().reverse().map((msg: ChatMessageDto) => (
                                    <div
                                        key={msg.id}
                                        className={`message ${msg.senderId === user?.id ? 'sent' : ''}`}
                                    >
                                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                                            {msg.senderName.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div className="message-content">
                                            <p>{msg.content}</p>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                                {format(new Date(msg.createdAt), 'h:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <form onSubmit={handleSend} className="chat-input-container">
                                <input
                                    type="text"
                                    className="chat-input"
                                    placeholder="Type a message..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ borderRadius: '50%', width: 48, height: 48, padding: 0 }}
                                    disabled={!message.trim() || sendMutation.isPending}
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)'
                        }}>
                            <MessageCircle size={64} style={{ marginBottom: 16 }} />
                            <h3>Select a conversation</h3>
                            <p>Choose a contact to start chatting</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
