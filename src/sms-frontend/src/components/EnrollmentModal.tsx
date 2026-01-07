import { useState } from 'react';
import { X, CreditCard, BookOpen } from 'lucide-react';
import { CourseListDto } from '../lib/api';

interface EnrollmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: CourseListDto | null;
    onConfirmEnrollment: () => Promise<void>;
    isLoading: boolean;
}

export function EnrollmentModal({ isOpen, onClose, course, onConfirmEnrollment, isLoading }: EnrollmentModalProps) {
    if (!isOpen || !course) return null;

    const handlePayment = async () => {
        await onConfirmEnrollment();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">Enroll in Course</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Course Info */}
                <div style={{
                    display: 'flex',
                    gap: 16,
                    padding: 16,
                    background: 'var(--bg-tertiary)',
                    borderRadius: 'var(--border-radius)',
                    marginBottom: 24
                }}>
                    {/* Course Thumbnail */}
                    <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: 'var(--border-radius)',
                        background: 'var(--gradient-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <BookOpen size={32} color="white" />
                    </div>

                    {/* Course Details */}
                    <div style={{ flex: 1 }}>
                        <span className="badge badge-primary" style={{ marginBottom: 8 }}>
                            {course.code}
                        </span>
                        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                            {course.name}
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                            {course.instructorName}
                        </p>
                    </div>
                </div>

                {/* Price Section */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24,
                    padding: '0 8px'
                }}>
                    <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)' }}>
                        Total Amount
                    </span>
                    <span style={{
                        fontSize: 28,
                        fontWeight: 700,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>
                        {course.price === 0 ? 'Free' : `$${course.price.toFixed(2)}`}
                    </span>
                </div>

                {/* Demo Mode Notice */}
                <div style={{
                    padding: 16,
                    background: 'rgba(6, 182, 212, 0.1)',
                    border: '2px solid var(--info)',
                    borderRadius: 'var(--border-radius)',
                    marginBottom: 24
                }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <CreditCard size={20} style={{ color: 'var(--info)', flexShrink: 0, marginTop: 2 }} />
                        <div>
                            <p style={{ fontWeight: 600, color: 'var(--info)', marginBottom: 4 }}>
                                Demo Payment Mode
                            </p>
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                                In production, this would use Stripe payment processing.
                                Click "Complete Payment" to simulate enrollment.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 12 }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        style={{ flex: 1 }}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handlePayment}
                        style={{ flex: 2 }}
                        disabled={isLoading}
                    >
                        <CreditCard size={18} />
                        {isLoading
                            ? 'Processing...'
                            : course.price === 0
                                ? 'Enroll for Free'
                                : `Complete Payment $${course.price.toFixed(2)}`
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
