import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import { coursesApi, assignmentsApi, quizzesApi, notificationsApi, UserRole, SubmissionStatus } from '../lib/api';
import { BookOpen, FileText, HelpCircle, Bell, Calendar, Clock, Users, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

export function DashboardPage() {
    const { user } = useAuth();
    const isStudent = user?.role === UserRole.Student;
    const isInstructor = user?.role === UserRole.Instructor;
    const isInstructorOrAdmin = isInstructor || user?.role === UserRole.Admin;

    // Student queries
    const { data: enrollments } = useQuery({
        queryKey: ['enrollments'],
        queryFn: () => coursesApi.getMyEnrollments(),
        enabled: isStudent,
    });

    // Instructor queries
    const { data: instructorCourses } = useQuery({
        queryKey: ['instructorCourses'],
        queryFn: () => coursesApi.getMyCourses(),
        enabled: isInstructorOrAdmin,
    });

    // Assignments - different queries for different roles
    const { data: studentAssignments } = useQuery({
        queryKey: ['myAssignments'],
        queryFn: () => assignmentsApi.getMyAssignments(),
        enabled: isStudent,
    });

    const { data: instructorAssignments } = useQuery({
        queryKey: ['allAssignments'],
        queryFn: () => assignmentsApi.getAll({ pageSize: 50 }),
        enabled: isInstructorOrAdmin,
    });

    const { data: quizzes } = useQuery({
        queryKey: ['quizzes'],
        queryFn: () => quizzesApi.getAll({ pageSize: 5 }),
    });

    const { data: notifications } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationsApi.getAll(true),
    });

    // Stats calculations
    const courseCount = isStudent
        ? enrollments?.data.data?.length || 0
        : instructorCourses?.data.data?.length || 0;

    const pendingAssignments = studentAssignments?.data.data?.filter(
        a => a.mySubmissionStatus === undefined || a.mySubmissionStatus === SubmissionStatus.Pending
    ).length || 0;

    // For instructors - count total submissions across all assignments
    const totalSubmissions = instructorAssignments?.data.data?.items?.reduce(
        (acc, a) => acc + (a.submissionCount || 0), 0
    ) || 0;

    const upcomingQuizzes = quizzes?.data.data?.items.filter(
        q => new Date(q.startTime) > new Date() || (new Date(q.startTime) <= new Date() && new Date(q.endTime) >= new Date())
    ).length || 0;

    const unreadNotifs = notifications?.data.data?.length || 0;

    return (
        <div className="fade-in">
            <div className="page-header">
                <h1 className="page-title">Welcome back, {user?.firstName}!</h1>
                <p className="page-subtitle">
                    Here's what's happening with your {isStudent ? 'studies' : 'courses'} today.
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-4" style={{ marginBottom: 32 }}>
                <Link to="/courses" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-icon primary">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{courseCount}</div>
                        <div className="stat-label">{isStudent ? 'Enrolled Courses' : 'My Courses'}</div>
                    </div>
                </Link>

                <Link to="/assignments" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-icon warning">
                        <FileText size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{isStudent ? pendingAssignments : totalSubmissions}</div>
                        <div className="stat-label">{isStudent ? 'Pending Assignments' : 'Total Submissions'}</div>
                    </div>
                </Link>

                <Link to="/quizzes" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-icon success">
                        <HelpCircle size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{upcomingQuizzes}</div>
                        <div className="stat-label">{isStudent ? 'Upcoming Quizzes' : 'Active Quizzes'}</div>
                    </div>
                </Link>

                <Link to="/notifications" className="stat-card" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-icon info">
                        <Bell size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{unreadNotifs}</div>
                        <div className="stat-label">Unread Notifications</div>
                    </div>
                </Link>
            </div>

            {/* Content Grid */}
            <div className="grid grid-2">
                {/* Upcoming Quizzes */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <HelpCircle size={20} />
                            {isStudent ? 'Upcoming Quizzes' : 'Recent Quizzes'}
                        </h3>
                        <Link to="/quizzes" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 13 }}>
                            View All
                        </Link>
                    </div>
                    {quizzes?.data.data?.items.slice(0, 5).map(quiz => (
                        <div
                            key={quiz.id}
                            style={{
                                padding: 16,
                                background: 'var(--bg-tertiary)',
                                borderRadius: 'var(--border-radius)',
                                marginBottom: 12
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{quiz.title}</div>
                                    <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{quiz.courseName}</div>
                                </div>
                                <span className={`badge ${quiz.hasAttempted ? 'badge-success' : 'badge-primary'}`}>
                                    {quiz.hasAttempted ? 'Completed' : `${quiz.totalMarks} pts`}
                                </span>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: 16,
                                marginTop: 12,
                                fontSize: 13,
                                color: 'var(--text-muted)'
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar size={14} />
                                    {format(new Date(quiz.startTime), 'MMM d, yyyy')}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={14} />
                                    {quiz.durationMinutes} min
                                </span>
                            </div>
                        </div>
                    ))}
                    {(!quizzes?.data.data?.items.length) && (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>
                            No upcoming quizzes
                        </p>
                    )}
                </div>

                {/* Recent Notifications */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Bell size={20} />
                            Recent Notifications
                        </h3>
                        <Link to="/notifications" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 13 }}>
                            View All
                        </Link>
                    </div>
                    {notifications?.data.data?.slice(0, 5).map(notif => (
                        <div
                            key={notif.id}
                            className="notification-item unread"
                            style={{ borderRadius: 'var(--border-radius)', marginBottom: 8 }}
                        >
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Bell size={18} color="white" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{notif.title}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    {notif.message.length > 60 ? notif.message.slice(0, 60) + '...' : notif.message}
                                </div>
                            </div>
                        </div>
                    ))}
                    {(!notifications?.data.data?.length) && (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 32 }}>
                            No new notifications
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
