import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { quizzesApi, QuizQuestionDto, QuestionType } from '../lib/api';
import { Clock, AlertTriangle, Send, CheckCircle } from 'lucide-react';

export function QuizTakingPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [mustSubmitBy, setMustSubmitBy] = useState<Date | null>(null);

    const { data: quizData, isLoading: loadingQuiz } = useQuery({
        queryKey: ['quiz-take', id],
        queryFn: () => quizzesApi.getForTaking(id!),
        enabled: !!id,
    });

    const startMutation = useMutation({
        mutationFn: () => quizzesApi.start(id!),
        onSuccess: (data) => {
            if (data.data.success && data.data.data) {
                setAttemptId(data.data.data.attemptId);
                setMustSubmitBy(new Date(data.data.data.mustSubmitBy));
            }
        },
    });

    const submitMutation = useMutation({
        mutationFn: () => quizzesApi.submit({
            attemptId: attemptId!,
            answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })),
        }),
        onSuccess: (data) => {
            if (data.data.success) {
                alert(`Quiz submitted! Score: ${data.data.data?.score}/${data.data.data?.totalMarks}`);
                navigate('/quizzes');
            }
        },
    });

    // Timer
    useEffect(() => {
        if (!mustSubmitBy) return;

        const interval = setInterval(() => {
            const now = new Date();
            const diff = Math.max(0, Math.floor((mustSubmitBy.getTime() - now.getTime()) / 1000));
            setTimeLeft(diff);

            if (diff === 0) {
                submitMutation.mutate();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [mustSubmitBy]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswerChange = (questionId: string, answer: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: answer }));
    };

    if (loadingQuiz) {
        return <div className="loading-container"><div className="loading-spinner" /></div>;
    }

    if (!quizData?.data.success) {
        return (
            <div className="card" style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', padding: 48 }}>
                <AlertTriangle size={48} style={{ color: 'var(--warning)', marginBottom: 16 }} />
                <h2>Cannot Start Quiz</h2>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>{quizData?.data.message}</p>
                <button className="btn btn-primary" onClick={() => navigate('/quizzes')} style={{ marginTop: 24 }}>
                    Back to Quizzes
                </button>
            </div>
        );
    }

    const quiz = quizData.data.data!;
    const questions = startMutation.data?.data.data?.questions || [];

    // Not started yet
    if (!attemptId) {
        return (
            <div className="quiz-container fade-in">
                <div className="card" style={{ textAlign: 'center', padding: 48 }}>
                    <h1 style={{ fontSize: 28, marginBottom: 8 }}>{quiz.title}</h1>
                    {quiz.description && (
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>{quiz.description}</p>
                    )}

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 16,
                        maxWidth: 400,
                        margin: '0 auto 32px'
                    }}>
                        <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 12 }}>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{quiz.durationMinutes}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Minutes</div>
                        </div>
                        <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 12 }}>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{quiz.questions.length}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Questions</div>
                        </div>
                        <div style={{ background: 'var(--bg-tertiary)', padding: 16, borderRadius: 12 }}>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{quiz.totalMarks}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Points</div>
                        </div>
                    </div>

                    <div style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid var(--warning)',
                        borderRadius: 12,
                        padding: 16,
                        marginBottom: 24,
                        maxWidth: 400,
                        margin: '0 auto 24px'
                    }}>
                        <AlertTriangle size={20} color="var(--warning)" style={{ marginBottom: 8 }} />
                        <p style={{ fontSize: 14, color: 'var(--warning)' }}>
                            Once started, you must complete the quiz within the time limit.
                            Your answers will be auto-submitted when time runs out.
                        </p>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={() => startMutation.mutate()}
                        disabled={startMutation.isPending}
                        style={{ padding: '16px 48px', fontSize: 16 }}
                    >
                        {startMutation.isPending ? 'Starting...' : 'Start Quiz'}
                    </button>
                </div>
            </div>
        );
    }

    // Quiz in progress
    return (
        <div className="quiz-container fade-in">
            {/* Timer */}
            <div style={{
                position: 'sticky',
                top: 0,
                background: 'var(--bg-primary)',
                padding: '16px 0',
                marginBottom: 24,
                zIndex: 100,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <h2>{quiz.title}</h2>
                <div className={`quiz-timer ${timeLeft < 60 ? 'badge-error' : timeLeft < 300 ? 'badge-warning' : ''}`} style={{
                    animation: timeLeft < 60 ? 'pulse 1s infinite' : 'none',
                    fontSize: timeLeft < 300 ? 18 : 16,
                    fontWeight: timeLeft < 300 ? 700 : 600
                }}>
                    <Clock size={20} />
                    {formatTime(timeLeft)}
                </div>
            </div>

            {/* Questions */}
            {questions.map((question: QuizQuestionDto, index: number) => (
                <div key={question.id} className="quiz-question">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <span style={{ fontWeight: 600 }}>Question {index + 1}</span>
                        <span className="badge badge-primary">{question.marks} pts</span>
                    </div>

                    <p style={{ fontSize: 16, marginBottom: 20 }}>{question.questionText}</p>

                    {question.questionType === QuestionType.MultipleChoice && question.options?.map((option, optIndex) => (
                        <div
                            key={optIndex}
                            className={`quiz-option ${answers[question.id] === optIndex.toString() ? 'selected' : ''}`}
                            onClick={() => handleAnswerChange(question.id, optIndex.toString())}
                        >
                            <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                border: '2px solid',
                                borderColor: answers[question.id] === optIndex.toString() ? 'var(--primary)' : 'var(--border-color)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {answers[question.id] === optIndex.toString() && (
                                    <CheckCircle size={16} color="var(--primary)" />
                                )}
                            </div>
                            {option}
                        </div>
                    ))}

                    {question.questionType === QuestionType.TrueFalse && (
                        <div style={{ display: 'flex', gap: 12 }}>
                            {['true', 'false'].map(opt => (
                                <button
                                    key={opt}
                                    className={`btn ${answers[question.id] === opt ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => handleAnswerChange(question.id, opt)}
                                    style={{ flex: 1 }}
                                >
                                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}

                    {question.questionType === QuestionType.ShortAnswer && (
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Enter your answer"
                            value={answers[question.id] || ''}
                            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        />
                    )}
                </div>
            ))}

            {/* Submit */}
            <div style={{ textAlign: 'center', marginTop: 32 }}>
                {timeLeft < 300 && timeLeft > 60 && (
                    <div style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid var(--warning)',
                        borderRadius: 'var(--border-radius)',
                        padding: 12,
                        marginBottom: 16,
                        color: 'var(--warning)',
                    }}>
                        ⚠️ Less than 5 minutes remaining!
                    </div>
                )}
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        if (window.confirm('Are you sure you want to submit your quiz? You cannot change answers after submission.')) {
                            submitMutation.mutate();
                        }
                    }}
                    disabled={submitMutation.isPending}
                    style={{ padding: '16px 48px', fontSize: 16 }}
                >
                    <Send size={20} />
                    {submitMutation.isPending ? 'Submitting...' : 'Submit Quiz'}
                </button>
            </div>
        </div>
    );
}
