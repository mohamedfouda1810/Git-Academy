import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { quizzesApi, QuizAnswerResultDto } from '../lib/api';
import { ArrowLeft, Award, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export function QuizResultsPage() {
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();

    const { data: result, isLoading } = useQuery({
        queryKey: ['quiz-result', attemptId],
        queryFn: () => quizzesApi.getAttemptResult(attemptId!),
        enabled: !!attemptId,
    });

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    if (!result?.data.success || !result.data.data) {
        return (
            <div className="card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 48 }}>
                <h2>Results Not Found</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>
                    Unable to load quiz results.
                </p>
                <button className="btn btn-primary" onClick={() => navigate('/quizzes')} style={{ marginTop: 24 }}>
                    Back to Quizzes
                </button>
            </div>
        );
    }

    const attemptData = result.data.data;
    const percentage = attemptData.percentage;

    return (
        <div className="fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
            <button
                className="btn btn-secondary"
                onClick={() => navigate('/quizzes')}
                style={{ marginBottom: 24 }}
            >
                <ArrowLeft size={18} />
                Back to Quizzes
            </button>

            {/* Results Summary Card */}
            <div className="card" style={{
                background: percentage >= 70
                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)'
                    : percentage >= 50
                        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%)',
                borderColor: percentage >= 70 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--error)',
                marginBottom: 32
            }}>
                <div style={{ textAlign: 'center' }}>
                    <Award size={48} color={
                        percentage >= 70 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--error)'
                    } style={{ marginBottom: 16 }} />
                    <h1 style={{ fontSize: 28, marginBottom: 8 }}>{attemptData.quizTitle}</h1>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                        Submitted {attemptData.submittedAt && format(new Date(attemptData.submittedAt), 'MMM d, yyyy h:mm a')}
                    </p>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 24,
                        maxWidth: 500,
                        margin: '0 auto'
                    }}>
                        <div>
                            <div style={{ fontSize: 36, fontWeight: 700, color: percentage >= 70 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--error)' }}>
                                {percentage.toFixed(0)}%
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Percentage</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 36, fontWeight: 700 }}>
                                {attemptData.score}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Score</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 36, fontWeight: 700 }}>
                                {attemptData.totalMarks}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Total Marks</div>
                        </div>
                    </div>

                    <div style={{
                        marginTop: 24,
                        padding: 16,
                        background: 'var(--bg-tertiary)',
                        borderRadius: 'var(--border-radius)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 12
                    }}>
                        <TrendingUp size={20} color={percentage >= 70 ? 'var(--success)' : percentage >= 50 ? 'var(--warning)' : 'var(--error)'} />
                        <span>
                            {percentage >= 70 ? 'Excellent work!' : percentage >= 50 ? 'Good effort!' : 'Keep practicing!'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Question Results */}
            <div>
                <h2 style={{ fontSize: 24, marginBottom: 16 }}>Question Breakdown</h2>

                {attemptData.answers?.map((answer: QuizAnswerResultDto, index: number) => (
                    <div
                        key={index}
                        className="card"
                        style={{
                            marginBottom: 16,
                            borderLeft: `4px solid ${answer.isCorrect ? 'var(--success)' : 'var(--error)'}`,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    {answer.isCorrect ? (
                                        <CheckCircle size={20} color="var(--success)" />
                                    ) : (
                                        <XCircle size={20} color="var(--error)" />
                                    )}
                                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-muted)' }}>
                                        Question {index + 1}
                                    </span>
                                </div>
                                <p style={{ fontSize: 16, marginBottom: 16 }}>{answer.questionText}</p>

                                <div style={{
                                    display: 'grid',
                                    gap: 12
                                }}>
                                    {answer.yourAnswer && (
                                        <div style={{
                                            padding: 12,
                                            background: answer.isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            borderRadius: 'var(--border-radius)',
                                            border: `1px solid ${answer.isCorrect ? 'var(--success)' : 'var(--error)'}`,
                                        }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>
                                                Your Answer:
                                            </div>
                                            <div>{answer.yourAnswer}</div>
                                        </div>
                                    )}

                                    {!answer.isCorrect && (
                                        <div style={{
                                            padding: 12,
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            borderRadius: 'var(--border-radius)',
                                            border: '1px solid var(--success)',
                                        }}>
                                            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>
                                                Correct Answer:
                                            </div>
                                            <div>{answer.correctAnswer}</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{
                                minWidth: 80,
                                textAlign: 'right',
                                paddingLeft: 16
                            }}>
                                <div className={`badge ${answer.isCorrect ? 'badge-success' : 'badge-error'}`}>
                                    {answer.marksAwarded} pts
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {(!attemptData.answers || attemptData.answers.length === 0) && (
                    <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                        <p style={{ color: 'var(--text-muted)' }}>No detailed results available</p>
                    </div>
                )}
            </div>
        </div>
    );
}
