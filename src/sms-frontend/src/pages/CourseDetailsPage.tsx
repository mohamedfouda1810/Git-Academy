import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { coursesApi, CourseDetailsDto, CoursePreviewDto, UserRole, SessionDto } from '../lib/api';
import { SessionAccordion } from '../components/SessionAccordion';
import { PaymentModal } from '../components/PaymentModal';
import { SessionModal } from '../components/SessionModal';
import {
    ArrowLeft,
    BookOpen,
    Users,
    Calendar,
    Award,
    ShoppingCart,
    Lock,
    Plus,
    Settings,
    List
} from 'lucide-react';

export function CourseDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isStudent = user?.role === UserRole.Student;
    const isInstructorOrAdmin = user?.role === UserRole.Instructor || user?.role === UserRole.Admin;

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [editingSession, setEditingSession] = useState<SessionDto | undefined>(undefined);
    const [isEnrolling, setIsEnrolling] = useState(false);

    // Fetch course details
    const { data: courseResponse, isLoading, refetch } = useQuery({
        queryKey: ['course', id],
        queryFn: () => coursesApi.getById(id!),
        enabled: !!id,
    });

    // Fetch full session details for instructors/admins OR enrolled students
    const { data: sessionsResponse, refetch: refetchSessions } = useQuery({
        queryKey: ['sessions', id],
        queryFn: () => coursesApi.getSessions(id!),
        enabled: !!id, // Fetch for everyone - backend will handle authorization
    });

    const courseData = courseResponse?.data?.data;

    // Delete session mutation
    const deleteSessionMutation = useMutation({
        mutationFn: (sessionId: string) => coursesApi.deleteSession(id!, sessionId),
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['sessions', id] });
        },
    });

    // Type guard to check if it's CourseDetailsDto (has full course info)
    const isDetailsDto = (data: any): data is CourseDetailsDto => {
        return data && ('sessions' in data || 'instructorId' in data);
    };

    const course = courseData;
    const isDetails = isDetailsDto(courseData);

    // Check if user is the course instructor or admin
    // Need to check instructorId from course data
    const courseDetails = isDetails ? (course as CourseDetailsDto) : null;

    // For instructors: check if instructorId matches their userId
    // For admins: always grant access
    const isOwner = isInstructorOrAdmin && course && (
        user?.role === UserRole.Admin ||
        (courseDetails && courseDetails.instructorId === user?.id)
    );

    // Debug logging - check browser console
    console.log('Course Access Debug:', {
        courseId: id,
        userId: user?.id,
        userRole: user?.role,
        isInstructorOrAdmin,
        isDetails,
        courseInstructorId: courseDetails?.instructorId || 'N/A',
        isOwner,
        canAccessContent: !!((isDetails && courseDetails?.isEnrolled && courseDetails?.hasPaid) || isOwner),
    });

    const handleEnroll = async () => {
        // Free course - enroll directly
        if (course && course.price === 0) {
            setIsEnrolling(true);
            try {
                await coursesApi.enroll({ courseId: id! });
                refetch();
                queryClient.invalidateQueries({ queryKey: ['enrollments'] });
            } catch (error: any) {
                alert(error?.response?.data?.message || 'Enrollment failed');
            } finally {
                setIsEnrolling(false);
            }
        } else {
            // Paid course - show payment modal
            setShowPaymentModal(true);
        }
    };

    const handlePaymentSuccess = () => {
        setShowPaymentModal(false);
        refetch();
    };

    const handleStartQuiz = (quizId: string) => {
        navigate(`/quizzes/${quizId}/take`);
    };

    const handleAddSession = () => {
        setEditingSession(undefined);
        setShowSessionModal(true);
    };

    const handleEditSession = (session: SessionDto) => {
        setEditingSession(session);
        setShowSessionModal(true);
    };

    const handleDeleteSession = (sessionId: string) => {
        deleteSessionMutation.mutate(sessionId);
    };

    const handleSessionSuccess = () => {
        setShowSessionModal(false);
        setEditingSession(undefined);
        refetch();
        refetchSessions();
        queryClient.invalidateQueries({ queryKey: ['sessions', id] });
    };

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
                <BookOpen />
                <h3>Course Not Found</h3>
                <p>The course you're looking for doesn't exist or has been removed.</p>
                <button className="btn btn-primary" onClick={() => navigate('/courses')}>
                    Browse Courses
                </button>
            </div>
        );
    }

    const isEnrolled = isDetails && courseDetails?.isEnrolled;
    const hasPaid = isDetails && courseDetails?.hasPaid;
    // Use backend's hasAccess which handles all access logic (enrolled, instructor, admin)
    const hasAccessFromBackend = isDetails && courseDetails?.hasAccess;
    // Instructors (isOwner) ALWAYS have access to their own course content
    const canAccessContent = !!(hasAccessFromBackend || isOwner);

    // Use full session data if available (for instructors), otherwise use list data
    const sessionsToDisplay = sessionsResponse?.data?.data ||
        (isDetails ? (course as CourseDetailsDto).sessions : []);

    return (
        <div className="fade-in">
            {/* Back Button */}
            <button
                className="btn btn-secondary"
                onClick={() => navigate('/courses')}
                style={{ marginBottom: 24 }}
            >
                <ArrowLeft size={18} />
                Back to Courses
            </button>

            {/* Course Header */}
            <div className="card" style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
                    {/* Thumbnail */}
                    <div style={{
                        width: 200,
                        height: 200,
                        borderRadius: 'var(--border-radius)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: 'var(--gradient-cool)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {course.thumbnailUrl ? (
                            <img
                                src={course.thumbnailUrl}
                                alt={course.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <BookOpen size={64} color="white" />
                        )}
                    </div>

                    {/* Course Info */}
                    <div style={{ flex: 1, minWidth: 250 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <span className="badge badge-primary">{course.code}</span>
                            {isOwner && (
                                <span className="badge badge-success">Your Course</span>
                            )}
                        </div>
                        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
                            {course.name}
                        </h1>
                        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 20 }}>
                            {isDetails ? (course as CourseDetailsDto).description : course.previewDescription}
                        </p>

                        {/* Meta Info */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <BookOpen size={18} color="var(--primary)" />
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Instructor</div>
                                    <div style={{ fontWeight: 600 }}>{course.instructorName}</div>
                                </div>
                            </div>

                            {isDetails && (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Award size={18} color="var(--success)" />
                                        <div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Credits</div>
                                            <div style={{ fontWeight: 600 }}>{isDetails ? (course as CourseDetailsDto).credits : '3'}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Calendar size={18} color="var(--info)" />
                                        <div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Semester</div>
                                            <div style={{ fontWeight: 600 }}>
                                                {isDetails ? `${(course as CourseDetailsDto).semester} ${(course as CourseDetailsDto).year}` : 'Spring 2025'}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={18} color="var(--warning)" />
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Students</div>
                                    <div style={{ fontWeight: 600 }}>{course.enrollmentCount}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enrollment/Management Section */}
                    <div style={{
                        width: 250,
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        {/* Course Fee - Only show if NOT enrolled and NOT owner */}
                        {!isOwner && !isEnrolled && (
                            <div className="card" style={{ background: 'var(--bg-tertiary)', textAlign: 'center' }}>
                                <div className="price-tag" style={{ marginBottom: 8 }}>
                                    {course.price === 0 ? 'Free' : `$${course.price.toFixed(2)}`}
                                </div>
                                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                                    Course Fee
                                </div>
                            </div>
                        )}

                        {isStudent && !isEnrolled && (
                            <button
                                className="btn btn-primary pulse"
                                onClick={handleEnroll}
                                style={{ width: '100%' }}
                                disabled={isEnrolling}
                            >
                                <ShoppingCart size={18} />
                                {isEnrolling
                                    ? 'Enrolling...'
                                    : course.price === 0
                                        ? 'Enroll Free'
                                        : `Enroll - $${course.price.toFixed(2)}`}
                            </button>
                        )}

                        {isEnrolled && (
                            <div className="card" style={{
                                background: 'var(--gradient-success)',
                                color: 'white',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: 16, fontWeight: 600 }}>✓ Enrolled</div>
                            </div>
                        )}

                        {isOwner && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => navigate(`/courses/${id}/enrollments`)}
                                    style={{ width: '100%' }}
                                >
                                    <List size={18} />
                                    View Enrollments
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sessions */}
            {
                sessionsToDisplay && sessionsToDisplay.length > 0 ? (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <h2 style={{ fontSize: 24, fontWeight: 700 }}>
                                Course Sessions ({sessionsToDisplay.length})
                            </h2>
                            {isOwner && (
                                <button className="btn btn-primary" onClick={handleAddSession}>
                                    <Plus size={18} />
                                    Add Session
                                </button>
                            )}
                        </div>

                        {!canAccessContent && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(236, 72, 153, 0.1))',
                                border: '2px solid var(--primary)',
                                borderRadius: 'var(--border-radius-lg)',
                                padding: 32,
                                marginBottom: 24,
                                textAlign: 'center'
                            }}>
                                <div style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    background: 'var(--gradient-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    margin: '0 auto 16px'
                                }}>
                                    <Lock size={36} color="white" />
                                </div>
                                <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                                    Content Locked
                                </h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
                                    Enroll in this course to unlock all sessions, materials, quizzes, and assignments.
                                </p>
                                {isStudent && !isEnrolled && (
                                    <button className="btn btn-primary" onClick={handleEnroll}>
                                        <ShoppingCart size={18} />
                                        {course.price === 0 ? 'Enroll for Free' : `Enroll Now - $${course.price.toFixed(2)}`}
                                    </button>
                                )}
                            </div>
                        )}

                        <SessionAccordion
                            sessions={sessionsToDisplay}
                            canAccess={canAccessContent}
                            isInstructor={!!isOwner}
                            courseId={id}
                            onStartQuiz={handleStartQuiz}
                            onEditSession={handleEditSession}
                            onDeleteSession={handleDeleteSession}
                        />
                    </div>
                ) : (
                    <>
                        {isOwner ? (
                            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                                <BookOpen size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                                <h3 style={{ marginBottom: 8 }}>No Sessions Yet</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                                    Start building your course by adding sessions with content
                                </p>
                                <button className="btn btn-primary" onClick={handleAddSession}>
                                    <Plus size={18} />
                                    Add First Session
                                </button>
                            </div>
                        ) : !isDetails ? (
                            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                                <Lock size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                                <h3 style={{ marginBottom: 8 }}>Course Content Locked</h3>
                                <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                                    Enroll in this course to view the full course description and session details
                                </p>
                                {isStudent && (
                                    <button className="btn btn-primary" onClick={handleEnroll}>
                                        <ShoppingCart size={18} />
                                        Enroll Now - ${course.price.toFixed(2)}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                                <BookOpen size={48} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                                <h3 style={{ marginBottom: 8 }}>No Sessions Available</h3>
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    The instructor hasn't added any sessions yet
                                </p>
                            </div>
                        )}
                    </>
                )
            }

            {/* Payment Modal */}
            {
                showPaymentModal && id && (
                    <PaymentModal
                        courseId={id}
                        onClose={() => setShowPaymentModal(false)}
                        onSuccess={handlePaymentSuccess}
                    />
                )
            }

            {/* Session Modal */}
            {
                showSessionModal && id && (
                    <SessionModal
                        courseId={id}
                        session={editingSession}
                        onClose={() => {
                            setShowSessionModal(false);
                            setEditingSession(undefined);
                        }}
                        onSuccess={handleSessionSuccess}
                    />
                )
            }
        </div >
    );
}
