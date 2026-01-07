import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { coursesApi, SessionDto, CreateSessionRequest, CreateSessionQuizRequest, QuestionType } from '../lib/api';
import { X, Upload, FileText, Video, HelpCircle, Plus, Trash2 } from 'lucide-react';

interface SessionModalProps {
    courseId: string;
    session?: SessionDto;
    onClose: () => void;
    onSuccess: () => void;
}

interface QuizQuestion {
    questionText: string;
    questionType: QuestionType;
    marks: number;
    options: string[];
    correctAnswer: string;
}

export function SessionModal({ courseId, session, onClose, onSuccess }: SessionModalProps) {
    const queryClient = useQueryClient();
    const pdfInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState(session?.title || '');
    const [description, setDescription] = useState(session?.description || '');
    const [order, setOrder] = useState(session?.order || 1);
    const [error, setError] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadType, setUploadType] = useState<'pdf' | 'video' | null>(null);

    // Quiz state
    const [showQuizForm, setShowQuizForm] = useState(false);
    const [quizTitle, setQuizTitle] = useState('');
    const [quizDuration, setQuizDuration] = useState(15);
    const [quizStartTime, setQuizStartTime] = useState('');
    const [quizEndTime, setQuizEndTime] = useState('');
    const [questions, setQuestions] = useState<QuizQuestion[]>([
        { questionText: '', questionType: QuestionType.MultipleChoice, marks: 1, options: ['', '', '', ''], correctAnswer: '' },
        { questionText: '', questionType: QuestionType.MultipleChoice, marks: 1, options: ['', '', '', ''], correctAnswer: '' },
        { questionText: '', questionType: QuestionType.MultipleChoice, marks: 1, options: ['', '', '', ''], correctAnswer: '' },
    ]);

    const createMutation = useMutation({
        mutationFn: (data: CreateSessionRequest) => coursesApi.createSession(courseId, data),
        onSuccess: (response) => {
            if (response.data.success) {
                queryClient.invalidateQueries({ queryKey: ['course', courseId] });
                onSuccess();
            } else {
                setError(response.data.message || 'Failed to create session');
            }
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to create session');
        },
    });

    const updateMutation = useMutation({
        mutationFn: (data: CreateSessionRequest) => coursesApi.updateSession(courseId, session!.id, data),
        onSuccess: (response) => {
            if (response.data.success) {
                queryClient.invalidateQueries({ queryKey: ['course', courseId] });
                onSuccess();
            } else {
                setError(response.data.message || 'Failed to update session');
            }
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to update session');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        const data: CreateSessionRequest = {
            title: title.trim(),
            description: description.trim(),
            order,
        };

        if (session) {
            updateMutation.mutate(data);
        } else {
            createMutation.mutate(data);
        }
    };

    const handleFileUpload = async (file: File, type: 'pdf' | 'video') => {
        if (!session) {
            setError('Please save the session first before uploading content');
            return;
        }

        setIsUploading(true);
        setUploadType(type);
        setError('');

        try {
            await coursesApi.uploadSessionContent(courseId, session.id, file, type);
            queryClient.invalidateQueries({ queryKey: ['course', courseId] });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || `Failed to upload ${type}`);
        } finally {
            setIsUploading(false);
            setUploadType(null);
        }
    };

    const handleCreateQuiz = async () => {
        if (!session) {
            setError('Please save the session first before creating a quiz');
            return;
        }

        if (!quizTitle.trim()) {
            setError('Please fill in quiz title');
            return;
        }

        const hasInvalidQuestions = questions.some(q => !q.questionText.trim() || !q.correctAnswer.trim());
        if (hasInvalidQuestions) {
            setError('Please complete all questions with correct answers');
            return;
        }

        try {
            const quizData: CreateSessionQuizRequest = {
                title: quizTitle.trim(),
                durationMinutes: quizDuration,
                questions: questions.map((q, index) => ({
                    questionText: q.questionText,
                    questionType: q.questionType,
                    marks: q.marks,
                    order: index + 1,
                    options: q.questionType === QuestionType.MultipleChoice ? q.options.filter(o => o.trim()) : undefined,
                    correctAnswer: q.correctAnswer,
                })),
            };

            await coursesApi.createSessionQuiz(courseId, session.id, quizData);
            queryClient.invalidateQueries({ queryKey: ['course', courseId] });
            onSuccess();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create quiz');
        }
    };

    const updateQuestion = (index: number, field: keyof QuizQuestion, value: any) => {
        const newQuestions = [...questions];
        (newQuestions[index] as any)[field] = value;
        setQuestions(newQuestions);
    };

    const updateQuestionOption = (qIndex: number, oIndex: number, value: string) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const isLoading = createMutation.isPending || updateMutation.isPending || isUploading;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh', overflow: 'auto' }}>
                <div className="modal-header">
                    <h2>{session ? 'Edit Session' : 'Create Session'}</h2>
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: 8 }}>
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--error)',
                        borderRadius: 'var(--border-radius)',
                        padding: 12,
                        marginBottom: 16,
                        color: 'var(--error)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Enter session title"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-input"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Enter session description"
                            rows={3}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Order</label>
                        <input
                            type="number"
                            className="form-input"
                            value={order}
                            onChange={e => setOrder(parseInt(e.target.value) || 1)}
                            min={1}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={isLoading} style={{ width: '100%', marginBottom: 24 }}>
                        {isLoading ? 'Saving...' : (session ? 'Update Session' : 'Create Session')}
                    </button>
                </form>

                {/* Content Upload Section - Only show for existing sessions */}
                {session && (
                    <>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

                        <h3 style={{ marginBottom: 16 }}>Session Content</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                            {/* PDF Upload */}
                            <div>
                                <input
                                    type="file"
                                    ref={pdfInputRef}
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(file, 'pdf');
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => pdfInputRef.current?.click()}
                                    disabled={isUploading}
                                    style={{ width: '100%', gap: 8 }}
                                >
                                    <FileText size={18} />
                                    {uploadType === 'pdf' ? 'Uploading...' : (session.pdfUrl ? 'Replace PDF' : 'Upload PDF')}
                                </button>
                                {session.pdfUrl && (
                                    <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 8, textAlign: 'center' }}>
                                        ✓ PDF uploaded
                                    </div>
                                )}
                            </div>

                            {/* Video Upload */}
                            <div>
                                <input
                                    type="file"
                                    ref={videoInputRef}
                                    accept="video/*"
                                    style={{ display: 'none' }}
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(file, 'video');
                                    }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    onClick={() => videoInputRef.current?.click()}
                                    disabled={isUploading}
                                    style={{ width: '100%', gap: 8 }}
                                >
                                    <Video size={18} />
                                    {uploadType === 'video' ? 'Uploading...' : (session.videoUrl ? 'Replace Video' : 'Upload Video')}
                                </button>
                                {session.videoUrl && (
                                    <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 8, textAlign: 'center' }}>
                                        ✓ Video uploaded
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quiz Section */}
                        {!session.hasQuiz && (
                            <>
                                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '24px 0' }} />

                                {!showQuizForm ? (
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setShowQuizForm(true)}
                                        style={{ width: '100%', gap: 8 }}
                                    >
                                        <HelpCircle size={18} />
                                        Add Quiz to Session
                                    </button>
                                ) : (
                                    <div>
                                        <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <HelpCircle size={20} />
                                            Create Session Quiz
                                        </h3>

                                        <div className="form-group">
                                            <label className="form-label">Quiz Title</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={quizTitle}
                                                onChange={e => setQuizTitle(e.target.value)}
                                                placeholder="Enter quiz title"
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                            <div className="form-group">
                                                <label className="form-label">Duration (min)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={quizDuration}
                                                    onChange={e => setQuizDuration(parseInt(e.target.value) || 15)}
                                                    min={1}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Start Time</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-input"
                                                    value={quizStartTime}
                                                    onChange={e => setQuizStartTime(e.target.value)}
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">End Time</label>
                                                <input
                                                    type="datetime-local"
                                                    className="form-input"
                                                    value={quizEndTime}
                                                    onChange={e => setQuizEndTime(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <h4 style={{ marginTop: 16, marginBottom: 12 }}>Questions (3 required)</h4>

                                        {questions.map((q, qIndex) => (
                                            <div key={qIndex} style={{
                                                background: 'var(--bg-tertiary)',
                                                borderRadius: 'var(--border-radius)',
                                                padding: 16,
                                                marginBottom: 12
                                            }}>
                                                <div style={{ fontWeight: 600, marginBottom: 8 }}>Question {qIndex + 1}</div>

                                                <div className="form-group">
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        value={q.questionText}
                                                        onChange={e => updateQuestion(qIndex, 'questionText', e.target.value)}
                                                        placeholder="Enter question"
                                                    />
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                                                    {q.options.map((option, oIndex) => (
                                                        <input
                                                            key={oIndex}
                                                            type="text"
                                                            className="form-input"
                                                            value={option}
                                                            onChange={e => updateQuestionOption(qIndex, oIndex, e.target.value)}
                                                            placeholder={`Option ${oIndex + 1}`}
                                                        />
                                                    ))}
                                                </div>

                                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                    <div style={{ flex: 1 }}>
                                                        <select
                                                            className="form-input"
                                                            value={q.correctAnswer}
                                                            onChange={e => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                                                        >
                                                            <option value="">Select correct answer</option>
                                                            {q.options.filter(o => o.trim()).map((option, i) => (
                                                                <option key={i} value={option}>{option}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <input
                                                            type="number"
                                                            className="form-input"
                                                            value={q.marks}
                                                            onChange={e => updateQuestion(qIndex, 'marks', parseInt(e.target.value) || 1)}
                                                            min={1}
                                                            style={{ width: 80 }}
                                                            placeholder="Marks"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={handleCreateQuiz}
                                            disabled={isLoading}
                                            style={{ width: '100%', marginTop: 16 }}
                                        >
                                            Create Quiz
                                        </button>
                                    </div>
                                )}
                            </>
                        )}

                        {session.hasQuiz && (
                            <div style={{
                                background: 'rgba(16, 185, 129, 0.1)',
                                border: '1px solid var(--success)',
                                borderRadius: 'var(--border-radius)',
                                padding: 16,
                                textAlign: 'center',
                                color: 'var(--success)'
                            }}>
                                ✓ Quiz already created for this session
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
