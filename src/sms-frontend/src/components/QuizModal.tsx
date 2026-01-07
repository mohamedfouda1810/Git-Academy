import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { quizzesApi, coursesApi, CreateQuizRequest, CreateQuizQuestionRequest, QuestionType } from '../lib/api';
import { X, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface QuizModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function QuizModal({ onClose, onSuccess }: QuizModalProps) {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [courseId, setCourseId] = useState('');
    const [durationMinutes, setDurationMinutes] = useState(60);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [questions, setQuestions] = useState<CreateQuizQuestionRequest[]>([
        {
            questionText: '',
            questionType: QuestionType.MultipleChoice,
            marks: 10,
            order: 1,
            options: ['', '', '', ''],
            correctAnswer: ''
        }
    ]);

    // Fetch instructor's courses
    const { data: courses } = useQuery({
        queryKey: ['instructorCourses'],
        queryFn: () => coursesApi.getMyCourses(),
    });

    const createMutation = useMutation({
        mutationFn: (data: CreateQuizRequest) => quizzesApi.create(data),
        onSuccess: () => {
            onSuccess();
        },
    });

    const handleAddQuestion = () => {
        setQuestions([...questions, {
            questionText: '',
            questionType: QuestionType.MultipleChoice,
            marks: 10,
            order: questions.length + 1,
            options: ['', '', '', ''],
            correctAnswer: ''
        }]);
    };

    const handleRemoveQuestion = (index: number) => {
        if (questions.length > 1) {
            setQuestions(questions.filter((_, i) => i !== index));
        }
    };

    const handleQuestionChange = (index: number, field: keyof CreateQuizQuestionRequest, value: any) => {
        const updated = [...questions];
        updated[index] = { ...updated[index], [field]: value };
        setQuestions(updated);
    };

    const handleOptionChange = (questionIndex: number, optionIndex: number, value: string) => {
        const updated = [...questions];
        const options = [...(updated[questionIndex].options || [])];
        options[optionIndex] = value;
        updated[questionIndex] = { ...updated[questionIndex], options };
        setQuestions(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!courseId) {
            alert('Please select a course');
            return;
        }

        // Validate questions
        for (const q of questions) {
            if (!q.questionText.trim()) {
                alert('All questions must have text');
                return;
            }
            if (q.questionType === QuestionType.MultipleChoice) {
                if (!q.options || q.options.length < 2) {
                    alert('Multiple choice questions must have at least 2 options');
                    return;
                }
                if (!q.correctAnswer.trim()) {
                    alert('All questions must have a correct answer');
                    return;
                }
            }
        }

        const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

        createMutation.mutate({
            title,
            description: description || undefined,
            durationMinutes,
            startTime,
            endTime,
            shuffleQuestions,
            courseId,
            questions: questions.map((q, i) => ({ ...q, order: i + 1 }))
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }}>
                <div className="modal-header">
                    <h2>Create Quiz</h2>
                    <button className="btn btn-secondary" onClick={onClose} style={{ padding: 8 }}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Basic Info */}
                    <div className="form-group">
                        <label className="form-label">Quiz Title *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-input"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Course *</label>
                        <select
                            className="form-input"
                            value={courseId}
                            onChange={e => setCourseId(e.target.value)}
                            required
                        >
                            <option value="">Select a course</option>
                            {courses?.data.data?.map(course => (
                                <option key={course.id} value={course.id}>{course.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Duration (minutes) *</label>
                            <input
                                type="number"
                                className="form-input"
                                value={durationMinutes}
                                onChange={e => setDurationMinutes(parseInt(e.target.value) || 60)}
                                min={1}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Start Time *</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={startTime}
                                onChange={e => setStartTime(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">End Time *</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={endTime}
                                onChange={e => setEndTime(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input
                                type="checkbox"
                                checked={shuffleQuestions}
                                onChange={e => setShuffleQuestions(e.target.checked)}
                            />
                            Shuffle questions
                        </label>
                    </div>

                    {/* Questions */}
                    <div style={{ marginTop: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3>Questions</h3>
                            <button
                                type="button"
                                className="btn btn-outline"
                                onClick={handleAddQuestion}
                                style={{ padding: '6px 12px', fontSize: 13 }}
                            >
                                <Plus size={16} />
                                Add Question
                            </button>
                        </div>

                        {questions.map((question, qIndex) => (
                            <div key={qIndex} className="card" style={{ background: 'var(--bg-tertiary)', marginBottom: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                    <h4>Question {qIndex + 1}</h4>
                                    {questions.length > 1 && (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => handleRemoveQuestion(qIndex)}
                                            style={{ padding: 6 }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Question Text *</label>
                                    <textarea
                                        className="form-input"
                                        value={question.questionText}
                                        onChange={e => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                                        rows={2}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Type *</label>
                                        <select
                                            className="form-input"
                                            value={question.questionType}
                                            onChange={e => handleQuestionChange(qIndex, 'questionType', parseInt(e.target.value))}
                                        >
                                            <option value={QuestionType.MultipleChoice}>Multiple Choice</option>
                                            <option value={QuestionType.TrueFalse}>True/False</option>
                                            <option value={QuestionType.ShortAnswer}>Short Answer</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Marks *</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={question.marks}
                                            onChange={e => handleQuestionChange(qIndex, 'marks', parseInt(e.target.value) || 1)}
                                            min={1}
                                            required
                                        />
                                    </div>
                                </div>

                                {question.questionType === QuestionType.MultipleChoice && (
                                    <div className="form-group">
                                        <label className="form-label">Options *</label>
                                        {(question.options || []).map((option, oIndex) => (
                                            <input
                                                key={oIndex}
                                                type="text"
                                                className="form-input"
                                                value={option}
                                                onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                placeholder={`Option ${oIndex + 1}`}
                                                style={{ marginBottom: 8 }}
                                                required
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">Correct Answer *</label>
                                    {question.questionType === QuestionType.MultipleChoice ? (
                                        <select
                                            className="form-input"
                                            value={question.correctAnswer}
                                            onChange={e => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                                            required
                                        >
                                            <option value="">Select correct answer</option>
                                            {(question.options || []).map((option, i) => option && (
                                                <option key={i} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={question.correctAnswer}
                                            onChange={e => handleQuestionChange(qIndex, 'correctAnswer', e.target.value)}
                                            required
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Submit */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createMutation.isPending}
                            style={{ flex: 1 }}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Quiz'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
