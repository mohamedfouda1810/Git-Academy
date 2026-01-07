import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { coursesApi, UserRole, CourseListDto, EnrollmentDto } from '../lib/api';
import { BookOpen, Users, DollarSign, Plus } from 'lucide-react';
import { SubjectModal } from '../components/SubjectModal';
import { useState } from 'react';

export function SubjectsPage() {
    const { user } = useAuth();
    const isStudent = user?.role === UserRole.Student;
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: courses, isLoading } = useQuery({
        queryKey: ['courses'],
        queryFn: () => coursesApi.getAll({ pageSize: 20 }),
    });

    const { data: enrollments } = useQuery({
        queryKey: ['enrollments'],
        queryFn: () => coursesApi.getMyEnrollments(),
        enabled: isStudent,
    });

    const enrolledIds = new Set(enrollments?.data.data?.map((e: EnrollmentDto) => e.courseId) || []);

    const handleEnroll = async (courseId: string) => {
        try {
            await coursesApi.enroll({ courseId });
            window.location.reload();
        } catch (err) {
            console.error('Enrollment failed', err);
        }
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h1 className="page-title">Courses</h1>
                    <p className="page-subtitle">Browse and enroll in available courses</p>
                </div>
                {(user?.role === UserRole.Instructor || user?.role === UserRole.Admin) && (
                    <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                        <Plus size={20} />
                        Add Course
                    </button>
                )}
            </div>

            <div className="grid grid-3">
                {courses?.data.data?.items.map((course: CourseListDto) => (
                    <div key={course.id} className="card" style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 4,
                            background: 'var(--gradient-primary)',
                            borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0'
                        }} />

                        <div style={{ marginBottom: 16 }}>
                            <span className="badge badge-primary">{course.code}</span>
                        </div>

                        <h3 style={{ fontSize: 18, marginBottom: 8 }}>{course.name}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                            {course.instructorName}
                        </p>

                        <div style={{
                            display: 'flex',
                            gap: 16,
                            fontSize: 13,
                            color: 'var(--text-muted)',
                            marginBottom: 20
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Users size={14} />
                                {course.enrollmentCount} students
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <DollarSign size={14} />
                                ${course.price}
                            </span>
                        </div>

                        {isStudent && (
                            <button
                                className={`btn ${enrolledIds.has(course.id) ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ width: '100%' }}
                                disabled={enrolledIds.has(course.id)}
                                onClick={() => handleEnroll(course.id)}
                            >
                                {enrolledIds.has(course.id) ? 'Enrolled' : 'Enroll Now'}
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {(!courses?.data.data?.items.length) && (
                <div className="card" style={{ textAlign: 'center', padding: 64 }}>
                    <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h3 style={{ marginBottom: 8 }}>No Courses Available</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Check back later for new courses
                    </p>
                </div>
            )}

            <SubjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} currentUser={user} />
        </div>
    );
}
