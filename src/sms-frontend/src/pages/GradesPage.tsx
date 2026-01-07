import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { gradesApi, UserRole, GradeItemDto, CourseGradeSummaryDto, InstructorCourseGradesDto, StudentGradeSummaryDto } from '../lib/api';
import { Award, BookOpen, FileText, HelpCircle, TrendingUp, ChevronDown, ChevronUp, Users, User } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';

export function GradesPage() {
    const { user } = useAuth();
    const isStudent = user?.role === UserRole.Student;
    const isInstructor = user?.role === UserRole.Instructor || user?.role === UserRole.Admin;
    const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

    // Student grades query
    const { data: studentGradesData, isLoading: studentLoading } = useQuery({
        queryKey: ['my-grades'],
        queryFn: () => gradesApi.getMyGrades(),
        enabled: isStudent,
    });

    // Instructor grades query
    const { data: instructorGradesData, isLoading: instructorLoading } = useQuery({
        queryKey: ['instructor-grades'],
        queryFn: () => gradesApi.getInstructorGrades(),
        enabled: isInstructor,
    });

    const studentGrades = studentGradesData?.data?.data;
    const instructorGrades = instructorGradesData?.data?.data;

    const toggleCourse = (courseId: string) => {
        setExpandedCourses(prev => {
            const next = new Set(prev);
            if (next.has(courseId)) {
                next.delete(courseId);
            } else {
                next.add(courseId);
            }
            return next;
        });
    };

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return 'var(--success)';
        if (percentage >= 80) return 'var(--info)';
        if (percentage >= 70) return 'var(--primary)';
        if (percentage >= 60) return 'var(--warning)';
        return 'var(--error)';
    };

    const getGradeLetter = (percentage: number) => {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    };

    const isLoading = isStudent ? studentLoading : instructorLoading;

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    // ========== INSTRUCTOR VIEW ==========
    if (isInstructor) {
        return (
            <div className="fade-in">
                <div className="page-header" style={{ marginBottom: 24 }}>
                    <h1 className="page-title">Student Grades</h1>
                    <p className="page-subtitle">View all enrolled students' grades across your courses</p>
                </div>

                {instructorGrades && instructorGrades.courses.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {instructorGrades.courses.map((course: InstructorCourseGradesDto) => (
                            <div key={course.courseId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Course Header */}
                                <div
                                    onClick={() => toggleCourse(course.courseId)}
                                    style={{
                                        padding: 20,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: expandedCourses.has(course.courseId) ? 'var(--bg-tertiary)' : 'transparent'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{
                                            width: 50,
                                            height: 50,
                                            borderRadius: 'var(--border-radius)',
                                            background: 'var(--gradient-cool)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <BookOpen size={24} color="white" />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                <span className="badge badge-primary">{course.courseCode}</span>
                                            </div>
                                            <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                                                {course.courseName}
                                            </h3>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Users size={18} color="var(--text-muted)" />
                                            <span style={{ fontWeight: 600 }}>{course.enrolledCount} students</span>
                                        </div>
                                        {expandedCourses.has(course.courseId) ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                    </div>
                                </div>

                                {/* Expanded Student List */}
                                {expandedCourses.has(course.courseId) && (
                                    <div style={{ borderTop: '1px solid var(--border-color)' }}>
                                        {course.students.length > 0 ? (
                                            <table className="table" style={{ margin: 0 }}>
                                                <thead>
                                                    <tr>
                                                        <th>Student</th>
                                                        <th>Email</th>
                                                        <th>Assignments</th>
                                                        <th>Quizzes</th>
                                                        <th>Total Score</th>
                                                        <th>Grade</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {course.students.map((student: StudentGradeSummaryDto) => (
                                                        <tr key={student.studentId}>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                    <div style={{
                                                                        width: 32,
                                                                        height: 32,
                                                                        borderRadius: '50%',
                                                                        background: 'var(--gradient-primary)',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}>
                                                                        <User size={16} color="white" />
                                                                    </div>
                                                                    <span style={{ fontWeight: 500 }}>{student.studentName}</span>
                                                                </div>
                                                            </td>
                                                            <td style={{ color: 'var(--text-secondary)' }}>{student.studentEmail}</td>
                                                            <td>{student.completedAssignments}</td>
                                                            <td>{student.completedQuizzes}</td>
                                                            <td style={{ fontWeight: 600 }}>
                                                                {student.totalEarned.toFixed(1)} / {student.totalPossible.toFixed(1)}
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                    <div style={{
                                                                        width: 60,
                                                                        height: 6,
                                                                        background: 'var(--bg-tertiary)',
                                                                        borderRadius: 3,
                                                                        overflow: 'hidden'
                                                                    }}>
                                                                        <div style={{
                                                                            width: `${Math.min(student.percentage, 100)}%`,
                                                                            height: '100%',
                                                                            background: getGradeColor(student.percentage)
                                                                        }} />
                                                                    </div>
                                                                    <span style={{
                                                                        fontWeight: 700,
                                                                        color: getGradeColor(student.percentage)
                                                                    }}>
                                                                        {student.percentage.toFixed(1)}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                                                No students enrolled yet
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="card" style={{ textAlign: 'center', padding: 64 }}>
                        <Users size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                        <h3 style={{ marginBottom: 8 }}>No Courses</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Create courses and wait for students to enroll to see their grades.
                        </p>
                    </div>
                )}
            </div>
        );
    }

    // ========== STUDENT VIEW ==========
    return (
        <div className="fade-in">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 24 }}>
                <h1 className="page-title">My Grades</h1>
                <p className="page-subtitle">Track your academic performance across all courses</p>
            </div>

            {/* Overall Summary Card */}
            {studentGrades && studentGrades.courses.length > 0 && (
                <div className="card" style={{
                    marginBottom: 32,
                    background: 'var(--gradient-primary)',
                    color: 'white'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                        <div>
                            <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 4 }}>Overall Grade</div>
                            <div style={{ fontSize: 48, fontWeight: 800 }}>
                                {studentGrades.overallPercentage.toFixed(1)}%
                            </div>
                            <div style={{ fontSize: 14, opacity: 0.8 }}>
                                {studentGrades.overallTotalEarned.toFixed(1)} / {studentGrades.overallTotalPossible.toFixed(1)} points earned
                            </div>
                        </div>
                        <div style={{
                            width: 100,
                            height: 100,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 40,
                            fontWeight: 800
                        }}>
                            {getGradeLetter(studentGrades.overallPercentage)}
                        </div>
                    </div>
                </div>
            )}

            {/* Course Grades */}
            {studentGrades && studentGrades.courses.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {studentGrades.courses.map((course: CourseGradeSummaryDto) => (
                        <div key={course.courseId} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            {/* Course Header - Clickable */}
                            <div
                                onClick={() => toggleCourse(course.courseId)}
                                style={{
                                    padding: 20,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: expandedCourses.has(course.courseId) ? 'var(--bg-tertiary)' : 'transparent'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{
                                        width: 50,
                                        height: 50,
                                        borderRadius: 'var(--border-radius)',
                                        background: 'var(--gradient-cool)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <BookOpen size={24} color="white" />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span className="badge badge-primary">{course.courseCode}</span>
                                        </div>
                                        <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>
                                            {course.courseName}
                                        </h3>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                            {course.assignmentCount} assignment{course.assignmentCount !== 1 ? 's' : ''} •
                                            {course.quizCount} quiz{course.quizCount !== 1 ? 'zes' : ''}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: 28,
                                            fontWeight: 700,
                                            color: getGradeColor(course.percentage)
                                        }}>
                                            {course.percentage.toFixed(1)}%
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            {course.totalEarned.toFixed(1)} / {course.totalPossible.toFixed(1)}
                                        </div>
                                    </div>
                                    {expandedCourses.has(course.courseId) ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                </div>
                            </div>

                            {/* Expanded Grade Details */}
                            {expandedCourses.has(course.courseId) && (
                                <div style={{ borderTop: '1px solid var(--border-color)' }}>
                                    <table className="table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Type</th>
                                                <th>Score</th>
                                                <th>Percentage</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {course.grades.map((grade: GradeItemDto) => (
                                                <tr key={grade.id}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                            <div style={{
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 6,
                                                                background: grade.itemType === 'Assignment'
                                                                    ? 'rgba(102, 126, 234, 0.2)'
                                                                    : 'rgba(16, 185, 129, 0.2)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}>
                                                                {grade.itemType === 'Assignment'
                                                                    ? <FileText size={16} color="var(--primary)" />
                                                                    : <HelpCircle size={16} color="var(--success)" />
                                                                }
                                                            </div>
                                                            <span style={{ fontWeight: 500 }}>{grade.itemTitle}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${grade.itemType === 'Assignment' ? 'badge-primary' : 'badge-success'}`}>
                                                            {grade.itemType}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>
                                                        {grade.score} / {grade.maxScore}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div style={{
                                                                width: 60,
                                                                height: 6,
                                                                background: 'var(--bg-tertiary)',
                                                                borderRadius: 3,
                                                                overflow: 'hidden'
                                                            }}>
                                                                <div style={{
                                                                    width: `${Math.min(grade.percentage, 100)}%`,
                                                                    height: '100%',
                                                                    background: getGradeColor(grade.percentage)
                                                                }} />
                                                            </div>
                                                            <span style={{ fontWeight: 600, color: getGradeColor(grade.percentage) }}>
                                                                {grade.percentage.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td style={{ color: 'var(--text-secondary)' }}>
                                                        {format(new Date(grade.gradedAt), 'MMM d, yyyy')}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="card" style={{ textAlign: 'center', padding: 64 }}>
                    <TrendingUp size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                    <h3 style={{ marginBottom: 8 }}>No Grades Yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Complete assignments and quizzes to see your grades here.
                    </p>
                </div>
            )}
        </div>
    );
}
