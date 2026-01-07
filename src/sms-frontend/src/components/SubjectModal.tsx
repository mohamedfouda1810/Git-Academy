import { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { coursesApi, CreateCourseRequest, UserRole, UserDto } from '../lib/api';
import { X, Save } from 'lucide-react';

interface SubjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: UserDto | null;
}

export function SubjectModal({ isOpen, onClose, currentUser }: SubjectModalProps) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<CreateCourseRequest>({
        code: '',
        name: '',
        description: '',
        credits: 3,
        semester: 'Fall',
        year: new Date().getFullYear(),
        price: 0,
        instructorId: currentUser?.id || '',
    });
    const [error, setError] = useState('');

    useEffect(() => {
        if (currentUser?.id) {
            setFormData(prev => ({ ...prev, instructorId: currentUser.id }));
        }
    }, [currentUser]);

    const createMutation = useMutation({
        mutationFn: (data: CreateCourseRequest) => coursesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            queryClient.invalidateQueries({ queryKey: ['instructorSubjects'] });
            resetForm();
            onClose();
        },
        onError: (err: any) => {
            setError(err.response?.data?.message || 'Failed to create subject');
        },
    });

    const resetForm = () => {
        setFormData({
            code: '',
            name: '',
            description: '',
            credits: 3,
            semester: 'Fall',
            year: new Date().getFullYear(),
            price: 0,
            instructorId: currentUser?.id || '',
        });
        setError('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        createMutation.mutate(formData);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
        }} onClick={handleClose}>
            <div className="card" style={{
                maxWidth: 600,
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
                animation: 'slideUp 0.3s ease',
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700 }}>Create New Subject</h2>
                    <button
                        onClick={handleClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 8,
                            borderRadius: 8,
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
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
                        color: 'var(--error)',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Subject Code *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="CS101"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Credits *</label>
                            <input
                                type="number"
                                className="form-input"
                                min="1"
                                max="10"
                                value={formData.credits}
                                onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Subject Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Introduction to Computer Science"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="form-input"
                            placeholder="Course description and objectives..."
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            style={{ resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                        <div className="form-group">
                            <label className="form-label">Semester *</label>
                            <select
                                className="form-select"
                                value={formData.semester}
                                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                required
                            >
                                <option value="Fall">Fall</option>
                                <option value="Spring">Spring</option>
                                <option value="Summer">Summer</option>
                                <option value="Winter">Winter</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Year *</label>
                            <input
                                type="number"
                                className="form-input"
                                min="2020"
                                max="2030"
                                value={formData.year}
                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Price ($) *</label>
                            <input
                                type="number"
                                className="form-input"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleClose}
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
                            <Save size={18} />
                            {createMutation.isPending ? 'Creating...' : 'Create Subject'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Add keyframe animation for modal
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
if (!document.querySelector('style[data-modal-animations]')) {
    style.setAttribute('data-modal-animations', 'true');
    document.head.appendChild(style);
}
