import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentsApi, coursesApi, CreateAssignmentRequest, CourseListDto } from '../lib/api';
import { X, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AssignmentModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export function AssignmentModal({ onClose, onSuccess }: AssignmentModalProps) {
    const queryClient = useQueryClient();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [maxScore, setMaxScore] = useState(100);
    const [courseId, setCourseId] = useState('');
    const [allowedFileTypes, setAllowedFileTypes] = useState('.pdf,.doc,.docx');
    const [error, setError] = useState('');

    // Fetch instructor's courses
    const { data: coursesData } = useQuery({
        queryKey: ['myCourses'],
        queryFn: () => coursesApi.getMyCourses(),
    });

    const courses = coursesData?.data.data || [];

    const createMutation = useMutation({
        mutationFn: (data: CreateAssignmentRequest) => assignmentsApi.create(data),
        onSuccess: (response) => {
            if (response.data.success) {
                queryClient.invalidateQueries({ queryKey: ['allAssignments'] });
                onSuccess();
            } else {
                setError(response.data.message || 'Failed to create assignment');
            }
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to create assignment');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        if (!courseId) {
            setError('Please select a course');
            return;
        }

        if (!dueDate) {
            setError('Due date is required');
            return;
        }

        const data: CreateAssignmentRequest = {
            title: title.trim(),
            description: description.trim() || undefined,
            dueDate: new Date(dueDate).toISOString(),
            maxScore,
            courseId,
            allowedFileTypes: allowedFileTypes || undefined,
        };

        createMutation.mutate(data);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <h2>Create Assignment</h2>
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
                        <label className="form-label">Course *</label>
                        <select
                            className="form-input"
                            value={courseId}
                            onChange={e => setCourseId(e.target.value)}
                            required
                        >
                            <option value="">Select a course</option>
                            {courses.map((course: CourseListDto) => (
                                <option key={course.id} value={course.id}>
                                    {course.code} - {course.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Title *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Enter assignment title"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-input"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Enter assignment description"
                            rows={3}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Due Date *</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Max Score</label>
                            <input
                                type="number"
                                className="form-input"
                                value={maxScore}
                                onChange={e => setMaxScore(parseInt(e.target.value) || 100)}
                                min={1}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Allowed File Types</label>
                        <input
                            type="text"
                            className="form-input"
                            value={allowedFileTypes}
                            onChange={e => setAllowedFileTypes(e.target.value)}
                            placeholder=".pdf,.doc,.docx"
                        />
                        <small style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                            Comma-separated list of file extensions
                        </small>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={createMutation.isPending}
                        style={{ width: '100%' }}
                    >
                        {createMutation.isPending ? 'Creating...' : 'Create Assignment'}
                    </button>
                </form>
            </div>
        </div>
    );
}
