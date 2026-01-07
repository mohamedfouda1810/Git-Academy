import { CourseListDto, UserRole } from '../lib/api';
import { BookOpen, Users, DollarSign, Eye, ShoppingCart } from 'lucide-react';

interface CourseCardProps {
    course: CourseListDto;
    onViewDetails: (id: string) => void;
    onEnroll?: (id: string) => void;
    isEnrolled?: boolean;
    userRole?: UserRole;
}

export function CourseCard({ course, onViewDetails, onEnroll, isEnrolled, userRole }: CourseCardProps) {
    const isStudent = userRole === UserRole.Student;

    return (
        <div className="card">
            {/* Thumbnail */}
            <div className="course-thumbnail">
                {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt={course.name} />
                ) : (
                    <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--gradient-cool)',
                    }}>
                        <BookOpen size={48} color="white" />
                    </div>
                )}
            </div>

            {/* Course Code Badge */}
            <div style={{ marginBottom: 16 }}>
                <span className="badge badge-primary">{course.code}</span>
            </div>

            {/* Course Title */}
            <h3 style={{ fontSize: 20, marginBottom: 8, fontWeight: 700 }}>{course.name}</h3>

            {/* Preview Description */}
            <p style={{
                color: 'var(--text-secondary)',
                fontSize: 14,
                marginBottom: 16,
                lineHeight: 1.6,
                minHeight: 60,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical'
            }}>
                {course.previewDescription}
            </p>

            {/* Course Info */}
            <div style={{
                display: 'flex',
                gap: 16,
                fontSize: 13,
                color: 'var(--text-muted)',
                marginBottom: 20,
                flexWrap: 'wrap'
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <BookOpen size={14} />
                    {course.instructorName}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={14} />
                    {course.enrollmentCount} students
                </span>
            </div>

            {/* Price */}
            <div style={{ marginBottom: 20 }}>
                <div className="price-tag">${course.price.toFixed(2)}</div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
                <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => onViewDetails(course.id)}
                >
                    <Eye size={18} />
                    View Details
                </button>

                {isStudent && !isEnrolled && onEnroll && (
                    <button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => onEnroll(course.id)}
                    >
                        <ShoppingCart size={18} />
                        Enroll
                    </button>
                )}

                {isStudent && isEnrolled && (
                    <button
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        disabled
                    >
                        ✓ Enrolled
                    </button>
                )}
            </div>
        </div>
    );
}
