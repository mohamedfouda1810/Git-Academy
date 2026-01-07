import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { notificationsApi, chatApi, NotificationDto, UserRole } from '../lib/api';
import { signalRService } from '../lib/signalr';
import {
    LayoutDashboard,
    BookOpen,
    FileText,
    HelpCircle,
    MessageCircle,
    Bell,
    LogOut,
    GraduationCap,
    User,
    Award
} from 'lucide-react';

export function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadMessages, setUnreadMessages] = useState(0);

    useEffect(() => {
        // Fetch initial counts
        const fetchCounts = async () => {
            try {
                const [notifResponse, chatResponse] = await Promise.all([
                    notificationsApi.getUnreadCount(),
                    chatApi.getUnreadCount(),
                ]);
                setUnreadNotifications(notifResponse.data.data || 0);
                setUnreadMessages(chatResponse.data.data || 0);
            } catch { }
        };
        fetchCounts();

        // Setup SignalR
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            signalRService.connectChat(accessToken).catch(console.error);
            signalRService.connectNotifications(accessToken).catch(console.error);

            const unsubMessage = signalRService.onMessage(() => {
                setUnreadMessages(prev => prev + 1);
            });

            const unsubNotification = signalRService.onNotification(() => {
                setUnreadNotifications(prev => prev + 1);
            });

            return () => {
                unsubMessage();
                unsubNotification();
                signalRService.disconnectAll();
            };
        }
    }, []);

    const [isCollapsed, setIsCollapsed] = useState(false);

    // ... (rest of useEffect)

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/courses', icon: BookOpen, label: 'Courses' },
        { to: '/assignments', icon: FileText, label: 'Assignments' },
        { to: '/quizzes', icon: HelpCircle, label: 'Quizzes' },
        { to: '/grades', icon: Award, label: 'Grades' },
        { to: '/chat', icon: MessageCircle, label: 'Chat', badge: unreadMessages },
        { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifications },
    ];

    // Add admin nav item if user is admin
    if (user?.role === UserRole.Admin) {
        navItems.push({ to: '/admin', icon: User, label: 'Admin Panel' });
    }

    return (
        <div className="app-layout">
            <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-logo">
                    <GraduationCap size={32} />
                    <h1>School MS</h1>
                </div>

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    style={{
                        position: 'absolute',
                        right: -12,
                        top: 24,
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: 'var(--shadow-md)',
                        zIndex: 10
                    }}
                >
                    {isCollapsed ? '>' : '<'}
                </button>

                <nav className="sidebar-nav">
                    {navItems
                        .map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                                title={isCollapsed ? item.label : ''}
                            >
                                <item.icon size={20} />
                                <span>{item.label}</span>
                                {item.badge ? (
                                    <span
                                        className="badge badge-error"
                                        style={{ marginLeft: 'auto', minWidth: 24, justifyContent: 'center' }}
                                    >
                                        {item.badge}
                                    </span>
                                ) : null}
                            </NavLink>
                        ))}
                </nav>

                <div className="sidebar-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '0 16px', overflow: 'hidden' }}>
                        <div className="avatar" style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--gradient-primary)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </div>
                        <div style={{ whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 600 }}>{user?.firstName} {user?.lastName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{getRoleName(user?.role!)}</div>
                        </div>
                    </div>
                    <button className="nav-item" onClick={handleLogout} style={{ width: '100%', cursor: 'pointer' }} title={isCollapsed ? 'Logout' : ''}>
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className={`main-content ${isCollapsed ? 'collapsed' : ''}`}>
                <Outlet />
            </main>
        </div>
    );
}
