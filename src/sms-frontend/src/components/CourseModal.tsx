import { useState, useEffect } from 'react';
import { UserDto, coursesApi, CreateCourseRequest, UpdateCourseRequest } from '../lib/api';
import { X } from 'lucide-react';

interface CourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: UserDto | null;
    courseId?: string;
}

export function CourseModal({ isOpen, onClose, currentUser, courseId }: CourseModalProps) {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        previewDescription: '',
        thumbnailUrl: '',
        credits: 3,
        semester: 'Fall',
        year: new Date().getFullYear(),
        price: 0,
        instructorId: currentUser?.id || '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (courseId && isOpen) {
            // Load course data for editing
            coursesApi.getById(courseId).then(res => {
                const course = res.data.data;
                if (course && 'credits' in course) {
                    setFormData({
                        code: course.code,
                        name: course.name,
                        description: course.description || '',
                        previewDescription: course.previewDescription || '',
                        thumbnailUrl: course.thumbnailUrl || '',
                        credits: course.credits,
                        semester: course.semester,
                        year: course.year,
                        price: course.price,
                        instructorId: course.instructorId,
                    });
                }
            });
        } else if (isOpen) {
            // Reset for new course
            setFormData({
                code: '',
                name: '',
                description: '',
                previewDescription: '',
                thumbnailUrl: '',
                credits: 3,
                semester: 'Fall',
                year: new Date().getFullYear(),
                price: 0,
                instructorId: currentUser?.id || '',
            });
        }
    }, [courseId, isOpen, currentUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (courseId) {
                await coursesApi.update(courseId, formData as UpdateCourseRequest);
            } else {
                await coursesApi.create(formData as CreateCourseRequest);
            }
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save course');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{courseId ? 'Edit Course' : 'Create New Course'}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--error)',
                        borderRadius: 'var(--border-radius)',
                        padding: 12,
                        marginBottom: 20,
                        color: 'var(--error)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Course Code</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="e.g., CS101"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Credits</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.credits}
                                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                                min="1"
                                max="6"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Course Name</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="e.g., Introduction to Programming"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Preview Description</label>
                        <textarea
                            className="form-input"
                            placeholder="Short description visible to non-enrolled students..."
                            value={formData.previewDescription}
                            onChange={(e) => setFormData({ ...formData, previewDescription: e.target.value })}
                            rows={2}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Full Description</label>
                        <textarea
                            className="form-input"
                            placeholder="Detailed course description..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Thumbnail URL (Optional)</label>
                        <input
                            type="url"
                            className="form-input"
                            placeholder="https://example.com/image.jpg"
                            value={formData.thumbnailUrl}
                            onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Semester</label>
                            <select
                                className="form-select"
                                value={formData.semester}
                                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                required
                            >
                                <option value="Fall">Fall</option>
                                <option value="Spring">Spring</option>
                                <option value="Summer">Summer</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Year</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                min="2020"
                                max="2030"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Price ($)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

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
                            disabled={isLoading}
                            style={{ flex: 1 }}
                        >
                            {isLoading ? 'Saving...' : (courseId ? 'Update Course' : 'Create Course')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
