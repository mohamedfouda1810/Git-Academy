import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { coursesApi, UserRole, EnrollmentDto } from '../lib/api';
import { ArrowLeft, Users, Calendar, Award, UserCheck } from 'lucide-react';

export function CourseEnrollmentsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const isInstructorOrAdmin = user?.role === UserRole.Instructor || user?.role === UserRole.Admin;

    // Fetch course details for header
    const { data: courseResponse, isLoading: courseLoading } = useQuery({
        queryKey: ['course', id],
        queryFn: () => coursesApi.getById(id!),
        enabled: !!id,
    });

    // Fetch enrollments
    const { data: enrollmentsResponse, isLoading: enrollmentsLoading } = useQuery({
        queryKey: ['course-enrollments', id],
        queryFn: () => coursesApi.getCourseEnrollments(id!),
        enabled: !!id && isInstructorOrAdmin,
    });

    const course = courseResponse?.data?.data;
    const enrollments = enrollmentsResponse?.data?.data || [];
    const isLoading = courseLoading || enrollmentsLoading;

    // Access control - only instructors and admins
    if (!isInstructorOrAdmin) {
        return (
            <div className="empty-state">
                <Users size={48} />
                <h3>Access Denied</h3>
                <p>Only instructors and admins can view course enrollments.</p>
                <button className="btn btn-primary" onClick={() => navigate('/courses')}>
                    Browse Courses
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="empty-state">
                <Users size={48} />
                <h3>Course Not Found</h3>
                <p>The course you're looking for doesn't exist.</p>
                <button className="btn btn-primary" onClick={() => navigate('/courses')}>
                    Browse Courses
                </button>
            </div>
        );
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="fade-in">
            {/* Back Button */}
            <button
                className="btn btn-secondary"
                onClick={() => navigate(`/courses/${id}`)}
                style={{ marginBottom: 24 }}
            >
                <ArrowLeft size={18} />
                Back to Course
            </button>

            {/* Header */}
            <div className="card" style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <div style={{
                        width: 60,
                        height: 60,
                        borderRadius: 'var(--border-radius)',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Users size={28} color="white" />
                    </div>
                    <div>
                        <span className="badge badge-primary" style={{ marginBottom: 4 }}>
                            {course.code}
                        </span>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
                            {course.name} - Enrolled Students
                        </h1>
                    </div>
                </div>

                {/* Stats */}
                <div style={{
                    display: 'flex',
                    gap: 24,
                    padding: 16,
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--border-radius)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserCheck size={20} color="var(--success)" />
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 700 }}>{enrollments.length}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Students Enrolled</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enrollments Table */}
            {enrollments.length > 0 ? (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--bg-tertiary)' }}>
                                <th style={{
                                    padding: 16,
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    Student Name
                                </th>
                                <th style={{
                                    padding: 16,
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Calendar size={14} />
                                        Enrolled On
                                    </div>
                                </th>
                                <th style={{
                                    padding: 16,
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <Award size={14} />
                                        Final Grade
                                    </div>
                                </th>
                                <th style={{
                                    padding: 16,
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    fontSize: 14,
                                    color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-color)'
                                }}>
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {enrollments.map((enrollment: EnrollmentDto, index: number) => (
                                <tr
                                    key={enrollment.id}
                                    style={{
                                        background: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    <td style={{
                                        padding: 16,
                                        borderBottom: '1px solid var(--border-color)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: '50%',
                                                background: 'var(--gradient-cool)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: 600,
                                                fontSize: 14
                                            }}>
                                                {enrollment.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div style={{ fontWeight: 500 }}>
                                                {enrollment.studentName}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{
                                        padding: 16,
                                        color: 'var(--text-secondary)',
                                        borderBottom: '1px solid var(--border-color)'
                                    }}>
                                        {formatDate(enrollment.enrolledAt)}
                                    </td>
                                    <td style={{
                                        padding: 16,
                                        textAlign: 'center',
                                        borderBottom: '1px solid var(--border-color)'
                                    }}>
                                        {enrollment.finalGrade !== null && enrollment.finalGrade !== undefined ? (
                                            <span style={{
                                                fontWeight: 600,
                                                color: enrollment.finalGrade >= 60 ? 'var(--success)' : 'var(--error)'
                                            }}>
                                                {enrollment.finalGrade.toFixed(1)}%
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{
                                        padding: 16,
                                        textAlign: 'center',
                                        borderBottom: '1px solid var(--border-color)'
                                    }}>
                                        <span className={`badge ${enrollment.isActive ? 'badge-success' : 'badge-secondary'}`}>
                                            {enrollment.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: 64 }}>
                    <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h3 style={{ marginBottom: 8 }}>No Students Enrolled</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        No students have enrolled in this course yet.
                    </p>
                </div>
            )}
        </div>
    );
}
