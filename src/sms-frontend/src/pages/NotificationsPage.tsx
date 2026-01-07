import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi, NotificationDto, NotificationType } from '../lib/api';
import {
    Bell,
    CheckCircle,
    HelpCircle,
    FileText,
    MessageCircle,
    Award,
    Megaphone,
    BookOpen,
    Trash2,
    Check,
    ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';

export function NotificationsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ['allNotifications'],
        queryFn: () => notificationsApi.getAll(false),
    });

    const markAsReadMutation = useMutation({
        mutationFn: (id: string) => notificationsApi.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: () => notificationsApi.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => notificationsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['allNotifications'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.QuizAvailable:
                return <HelpCircle size={20} />;
            case NotificationType.AssignmentDue:
                return <FileText size={20} />;
            case NotificationType.NewMessage:
                return <MessageCircle size={20} />;
            case NotificationType.GradePosted:
                return <Award size={20} />;
            case NotificationType.Announcement:
                return <Megaphone size={20} />;
            case NotificationType.EnrollmentConfirmed:
            case NotificationType.CourseUpdate:
                return <BookOpen size={20} />;
            default:
                return <Bell size={20} />;
        }
    };

    const getIconColor = (type: NotificationType) => {
        switch (type) {
            case NotificationType.QuizAvailable:
                return 'var(--primary)';
            case NotificationType.AssignmentDue:
                return 'var(--warning)';
            case NotificationType.NewMessage:
                return 'var(--info)';
            case NotificationType.GradePosted:
                return 'var(--success)';
            case NotificationType.Announcement:
                return 'var(--accent)';
            case NotificationType.EnrollmentConfirmed:
            case NotificationType.CourseUpdate:
                return 'var(--success)';
            default:
                return 'var(--primary)';
        }
    };

    const getNavigationPath = (notification: NotificationDto): string | null => {
        switch (notification.type) {
            case NotificationType.QuizAvailable:
                return '/quizzes';
            case NotificationType.AssignmentDue:
                return '/assignments';
            case NotificationType.NewMessage:
                return '/chat';
            case NotificationType.GradePosted:
                return '/assignments';
            case NotificationType.EnrollmentConfirmed:
            case NotificationType.CourseUpdate:
                return notification.referenceId ? `/courses/${notification.referenceId}` : '/courses';
            default:
                return null;
        }
    };

    const handleNotificationClick = (notification: NotificationDto) => {
        if (!notification.isRead) {
            markAsReadMutation.mutate(notification.id);
        }
        const path = getNavigationPath(notification);
        if (path) {
            navigate(path);
        }
    };

    if (isLoading) {
        return <div className="loading-container"><div className="loading-spinner" /></div>;
    }

    const unreadCount = notifications?.data.data?.filter(n => !n.isRead).length || 0;

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h1 className="page-title">Notifications</h1>
                    <p className="page-subtitle">
                        {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => markAllAsReadMutation.mutate()}
                        disabled={markAllAsReadMutation.isPending}
                    >
                        <CheckCircle size={18} />
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="card">
                {notifications?.data.data?.map((notification: NotificationDto) => {
                    const navPath = getNavigationPath(notification);

                    return (
                        <div
                            key={notification.id}
                            className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                            style={{
                                display: 'flex',
                                alignItems: 'start',
                                gap: 16,
                                cursor: navPath ? 'pointer' : 'default'
                            }}
                            onClick={() => navPath && handleNotificationClick(notification)}
                        >
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                background: `${getIconColor(notification.type)}20`,
                                color: getIconColor(notification.type),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {getIcon(notification.type)}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'start',
                                    marginBottom: 4
                                }}>
                                    <h4 style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {notification.title}
                                        {navPath && <ExternalLink size={14} color="var(--text-muted)" />}
                                    </h4>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                        {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                                    </span>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                    {notification.message}
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                                {!notification.isRead && (
                                    <button
                                        className="btn btn-secondary"
                                        style={{ padding: 8 }}
                                        onClick={() => markAsReadMutation.mutate(notification.id)}
                                        title="Mark as read"
                                    >
                                        <Check size={16} />
                                    </button>
                                )}
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: 8 }}
                                    onClick={() => deleteMutation.mutate(notification.id)}
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    );
                })}

                {(!notifications?.data.data?.length) && (
                    <div style={{ textAlign: 'center', padding: 64 }}>
                        <Bell size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                        <h3>No Notifications</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>You're all caught up!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
