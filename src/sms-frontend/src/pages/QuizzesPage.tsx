import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { quizzesApi, UserRole, QuizListDto, QuizAttemptResultDto } from '../lib/api';
import { HelpCircle, Clock, Calendar, Play, CheckCircle, Award, Eye, Users, Plus, Trash2 } from 'lucide-react';
import { format, isPast, isFuture } from 'date-fns';
import { useState } from 'react';
import { QuizModal } from '../components/QuizModal';

export function QuizzesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isStudent = user?.role === UserRole.Student;
    const isInstructorOrAdmin = user?.role === UserRole.Instructor || user?.role === UserRole.Admin;

    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [attempts, setAttempts] = useState<QuizAttemptResultDto[]>([]);
    const [showAttempts, setShowAttempts] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: quizzes, isLoading, refetch } = useQuery({
        queryKey: ['quizzes'],
        queryFn: () => quizzesApi.getAll({ pageSize: 50 }),
    });

    const getQuizStatus = (quiz: QuizListDto) => {
        const start = new Date(quiz.startTime);
        const end = new Date(quiz.endTime);

        if (quiz.hasAttempted) {
            return { label: 'Completed', badge: 'badge-success', icon: CheckCircle };
        }
        if (isFuture(start)) {
            return { label: 'Upcoming', badge: 'badge-primary', icon: Clock };
        }
        if (isPast(end)) {
            return { label: 'Expired', badge: 'badge-error', icon: Clock };
        }
        return { label: 'Available', badge: 'badge-success', icon: Play };
    };

    const handleViewAttempts = async (quizId: string) => {
        try {
            const response = await quizzesApi.getQuizAttempts(quizId);
            setAttempts(response.data.data || []);
            setSelectedQuizId(quizId);
            setShowAttempts(true);
        } catch (err) {
            console.error('Failed to fetch attempts', err);
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => quizzesApi.delete(id),
        onSuccess: () => {
            refetch();
        },
    });

    const handleDelete = (id: string, title: string) => {
        if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
            deleteMutation.mutate(id);
        }
    };

    // For students: filter out completed and expired quizzes (they go to Grades page)
    const allQuizzes = quizzes?.data.data?.items || [];
    const filteredQuizzes = isStudent
        ? allQuizzes.filter((q: QuizListDto) => {
            const isCompleted = q.hasAttempted;
            const isExpired = isPast(new Date(q.endTime));
            return !isCompleted && !isExpired;
        })
        : allQuizzes;

    if (isLoading) {
        return <div className="loading-container"><div className="loading-spinner" /></div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h1 className="page-title">Quizzes</h1>
                    <p className="page-subtitle">
                        {isStudent ? 'Take quizzes and view your results' : 'View quiz attempts and student performance'}
                    </p>
                </div>
                {isInstructorOrAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={20} />
                        Create Quiz
                    </button>
                )}
            </div>

            <div className="grid grid-2">
                {filteredQuizzes.map((quiz: QuizListDto) => {
                    const status = getQuizStatus(quiz);
                    const canTake = isStudent && status.label === 'Available';

                    return (
                        <div key={quiz.id} className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                <span className={`badge ${status.badge}`}>
                                    <status.icon size={12} style={{ marginRight: 4 }} />
                                    {status.label}
                                </span>
                                <span style={{
                                    background: 'var(--gradient-primary)',
                                    padding: '4px 12px',
                                    borderRadius: 20,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: 'white'
                                }}>
                                    {quiz.totalMarks} pts
                                </span>
                            </div>

                            <h3 style={{ fontSize: 18, marginBottom: 8 }}>{quiz.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                                {quiz.courseName}
                            </p>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: 12,
                                marginBottom: 20
                            }}>
                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    padding: 12,
                                    borderRadius: 8,
                                    fontSize: 13
                                }}>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Duration</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Clock size={14} />
                                        {quiz.durationMinutes} minutes
                                    </div>
                                </div>
                                <div style={{
                                    background: 'var(--bg-tertiary)',
                                    padding: 12,
                                    borderRadius: 8,
                                    fontSize: 13
                                }}>
                                    <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Available Until</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Calendar size={14} />
                                        {format(new Date(quiz.endTime), 'MMM d')}
                                    </div>
                                </div>
                            </div>

                            {/* Student: Show score if attempted */}
                            {isStudent && quiz.hasAttempted && quiz.myScore !== undefined && (
                                <div style={{
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    border: '1px solid var(--success)',
                                    borderRadius: 8,
                                    padding: 12,
                                    marginBottom: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12
                                }}>
                                    <Award size={24} color="var(--success)" />
                                    <div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your Score</div>
                                        <div style={{ fontSize: 18, fontWeight: 700 }}>{quiz.myScore} / {quiz.totalMarks}</div>
                                    </div>
                                </div>
                            )}

                            {/* Student: Take quiz button */}
                            {canTake && (
                                <Link
                                    to={`/quizzes/${quiz.id}/take`}
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                >
                                    <Play size={18} />
                                    Start Quiz
                                </Link>
                            )}

                            {/* Student: View results button */}
                            {isStudent && quiz.hasAttempted && quiz.myAttemptId && (
                                <Link
                                    to={`/quizzes/results/${quiz.myAttemptId}`}
                                    className="btn btn-secondary"
                                    style={{ width: '100%' }}
                                >
                                    View Results
                                </Link>
                            )}

                            {/* Instructor: View attempts and delete buttons */}
                            {isInstructorOrAdmin && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => handleViewAttempts(quiz.id)}
                                        style={{ flex: 1, gap: 8 }}
                                    >
                                        <Users size={18} />
                                        View Attempts
                                    </button>
                                    <button
                                        className="btn btn-outline"
                                        style={{ padding: '8px 16px', color: 'var(--error)', borderColor: 'var(--error)' }}
                                        onClick={() => handleDelete(quiz.id, quiz.title)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {(!filteredQuizzes.length) && (
                <div className="card" style={{ textAlign: 'center', padding: 64 }}>
                    <HelpCircle size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h3>No Quizzes Available</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {isStudent
                            ? 'Check back later for new quizzes'
                            : 'Quizzes will appear here when you add them to your courses'}
                    </p>
                </div>
            )}

            {/* Attempts Modal */}
            {showAttempts && (
                <div className="modal-overlay" onClick={() => setShowAttempts(false)}>
                    <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '80vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h2>Student Attempts</h2>
                            <button className="btn btn-secondary" onClick={() => setShowAttempts(false)} style={{ padding: 8 }}>
                                ×
                            </button>
                        </div>

                        {attempts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                                No attempts yet
                            </div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Started</th>
                                        <th>Completed</th>
                                        <th>Score</th>
                                        <th>%</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attempts.map(attempt => (
                                        <tr key={attempt.attemptId}>
                                            <td style={{ fontWeight: 500 }}>{attempt.studentName}</td>
                                            <td>{format(new Date(attempt.startedAt), 'MMM d, h:mm a')}</td>
                                            <td>
                                                {attempt.submittedAt
                                                    ? format(new Date(attempt.submittedAt), 'MMM d, h:mm a')
                                                    : <span className="badge badge-warning">In Progress</span>
                                                }
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {attempt.score} / {attempt.totalMarks}
                                            </td>
                                            <td>
                                                <span className={`badge ${(attempt.score / attempt.totalMarks) >= 0.7
                                                    ? 'badge-success'
                                                    : (attempt.score / attempt.totalMarks) >= 0.5
                                                        ? 'badge-warning'
                                                        : 'badge-error'
                                                    }`}>
                                                    {Math.round((attempt.score / attempt.totalMarks) * 100)}%
                                                </span>
                                            </td>
                                            <td>
                                                <Link
                                                    to={`/quizzes/results/${attempt.attemptId}`}
                                                    className="btn btn-outline"
                                                    style={{ padding: '4px 8px', fontSize: 12 }}
                                                >
                                                    <Eye size={14} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Create Quiz Modal */}
            {showCreateModal && (
                <QuizModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        refetch();
                    }}
                />
            )}
        </div>
    );
}
