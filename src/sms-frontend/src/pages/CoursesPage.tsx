import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { coursesApi, UserRole, CourseListDto, EnrollmentDto } from '../lib/api';
import { BookOpen, Users, DollarSign, Plus, ChevronRight, Search, ChevronLeft, Filter, Compass, GraduationCap } from 'lucide-react';
import { SubjectModal } from '../components/SubjectModal';
import { PaymentModal } from '../components/PaymentModal';
import { useState, useMemo } from 'react';

export function CoursesPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const isStudent = user?.role === UserRole.Student;
    const isInstructor = user?.role === UserRole.Instructor;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

    // View mode for students: 'enrolled' or 'explore'
    const [viewMode, setViewMode] = useState<'enrolled' | 'explore'>('enrolled');

    // Search and filter state
    const [searchTerm, setSearchTerm] = useState('');
    const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 9;

    // Fetch instructor's courses (separate query for type safety)
    const { data: myCoursesData, isLoading: myCoursesLoading, refetch: refetchMyCourses } = useQuery({
        queryKey: ['my-courses'],
        queryFn: () => coursesApi.getMyCourses(),
        enabled: isInstructor,
    });

    // Fetch all courses for students/admins
    const { data: allCoursesData, isLoading: allCoursesLoading, refetch: refetchAllCourses } = useQuery({
        queryKey: ['courses'],
        queryFn: () => coursesApi.getAll({ pageSize: 100 }),
        enabled: !isInstructor,
    });

    const coursesLoading = isInstructor ? myCoursesLoading : allCoursesLoading;
    const refetchCourses = isInstructor ? refetchMyCourses : refetchAllCourses;

    // Fetch enrollments for students
    const { data: enrollments, isLoading: enrollmentsLoading, refetch: refetchEnrollments } = useQuery({
        queryKey: ['enrollments'],
        queryFn: () => coursesApi.getMyEnrollments(),
        enabled: isStudent,
    });

    const enrolledIds = new Set(
        enrollments?.data?.data?.map((e: EnrollmentDto) => e.courseId) || []
    );

    // Get all courses list
    const allCourses = useMemo(() => {
        if (isInstructor) {
            return myCoursesData?.data?.data || [];
        }
        return allCoursesData?.data?.data?.items || [];
    }, [myCoursesData, allCoursesData, isInstructor]);

    // Separate enrolled and not-enrolled courses for students
    const enrolledCourses = useMemo(() => {
        if (!isStudent) return allCourses;
        return allCourses.filter((c: CourseListDto) => enrolledIds.has(c.id));
    }, [allCourses, enrolledIds, isStudent]);

    const exploreCourses = useMemo(() => {
        if (!isStudent) return [];
        return allCourses.filter((c: CourseListDto) => !enrolledIds.has(c.id));
    }, [allCourses, enrolledIds, isStudent]);

    // Current courses based on view mode
    const currentCourses = isStudent
        ? (viewMode === 'enrolled' ? enrolledCourses : exploreCourses)
        : allCourses;

    // Client-side filtering
    const filteredCourses = useMemo(() => {
        let items = currentCourses;

        // Search filter
        if (searchTerm.trim()) {
            const search = searchTerm.toLowerCase();
            items = items.filter((c: CourseListDto) =>
                c.name.toLowerCase().includes(search) ||
                c.code.toLowerCase().includes(search) ||
                c.instructorName.toLowerCase().includes(search)
            );
        }

        // Price filter (only for explore mode)
        if (viewMode === 'explore' || !isStudent) {
            if (priceFilter === 'free') {
                items = items.filter((c: CourseListDto) => c.price === 0);
            } else if (priceFilter === 'paid') {
                items = items.filter((c: CourseListDto) => c.price > 0);
            }
        }

        return items;
    }, [currentCourses, searchTerm, priceFilter, viewMode, isStudent]);

    // Pagination
    const totalPages = Math.ceil(filteredCourses.length / pageSize);
    const paginatedCourses = filteredCourses.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Free enrollment mutation (for courses with price = 0)
    const freeEnrollMutation = useMutation({
        mutationFn: (courseId: string) => coursesApi.enroll({ courseId }),
        onSuccess: () => {
            refetchEnrollments();
            refetchCourses();
            queryClient.invalidateQueries({ queryKey: ['enrollments'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        },
        onError: (error: any) => {
            alert(error?.response?.data?.message || 'Enrollment failed');
        }
    });

    const handleEnrollClick = (e: React.MouseEvent, course: CourseListDto) => {
        e.stopPropagation();
        if (course.price === 0) {
            freeEnrollMutation.mutate(course.id);
        } else {
            setSelectedCourseId(course.id);
        }
    };

    const handlePaymentSuccess = () => {
        refetchEnrollments();
        refetchCourses();
        queryClient.invalidateQueries({ queryKey: ['enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['courses'] });
    };

    const handleCardClick = (courseId: string) => {
        navigate(`/courses/${courseId}`);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleViewModeChange = (mode: 'enrolled' | 'explore') => {
        setViewMode(mode);
        setCurrentPage(1);
        setSearchTerm('');
        setPriceFilter('all');
    };

    const isLoading = coursesLoading || (isStudent && enrollmentsLoading);

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 className="page-title">
                        {isStudent
                            ? (viewMode === 'enrolled' ? 'My Courses' : 'Explore Courses')
                            : 'Courses'
                        }
                    </h1>
                    <p className="page-subtitle">
                        {isStudent
                            ? (viewMode === 'enrolled'
                                ? `You are enrolled in ${enrolledCourses.length} course${enrolledCourses.length !== 1 ? 's' : ''}`
                                : `${exploreCourses.length} course${exploreCourses.length !== 1 ? 's' : ''} available to explore`)
                            : `${filteredCourses.length} course${filteredCourses.length !== 1 ? 's' : ''} found`
                        }
                    </p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                    {/* View Mode Toggle for Students */}
                    {isStudent && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button
                                className={`btn ${viewMode === 'enrolled' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handleViewModeChange('enrolled')}
                            >
                                <GraduationCap size={18} />
                                My Courses
                            </button>
                            <button
                                className={`btn ${viewMode === 'explore' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handleViewModeChange('explore')}
                            >
                                <Compass size={18} />
                                Explore More
                            </button>
                        </div>
                    )}

                    {(user?.role === UserRole.Instructor || user?.role === UserRole.Admin) && (
                        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                            <Plus size={20} />
                            Add Course
                        </button>
                    )}
                </div>
            </div>

            {/* Search and Filter Bar - Show for explore mode or non-students */}
            {(viewMode === 'explore' || !isStudent) && (
                <div className="card" style={{ marginBottom: 24, padding: 16 }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Search Input */}
                        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Search by name, code, or instructor..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                style={{ paddingLeft: 40, width: '100%' }}
                            />
                        </div>

                        {/* Price Filter */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
                            <select
                                value={priceFilter}
                                onChange={(e) => {
                                    setPriceFilter(e.target.value as 'all' | 'free' | 'paid');
                                    setCurrentPage(1);
                                }}
                                style={{ width: 140 }}
                            >
                                <option value="all">All Prices</option>
                                <option value="free">Free Only</option>
                                <option value="paid">Paid Only</option>
                            </select>
                        </div>

                        {/* Clear Button */}
                        {(searchTerm || priceFilter !== 'all') && (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setSearchTerm('');
                                    setPriceFilter('all');
                                    setCurrentPage(1);
                                }}
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Course Grid */}
            <div className="grid grid-3">
                {paginatedCourses.map((course: CourseListDto) => (
                    <div
                        key={course.id}
                        className="card"
                        onClick={() => handleCardClick(course.id)}
                        style={{
                            position: 'relative',
                            cursor: 'pointer',
                        }}
                    >
                        {/* Top accent bar */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 4,
                            background: enrolledIds.has(course.id) ? 'var(--gradient-success)' : 'var(--gradient-primary)',
                            borderRadius: 'var(--border-radius-lg) var(--border-radius-lg) 0 0'
                        }} />

                        {/* Course Code Badge */}
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="badge badge-primary">{course.code}</span>
                            <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                        </div>

                        {/* Course Title */}
                        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                            {course.name}
                        </h3>

                        {/* Instructor */}
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>
                            {course.instructorName}
                        </p>

                        {/* Stats */}
                        <div style={{
                            display: 'flex',
                            gap: 16,
                            fontSize: 13,
                            color: 'var(--text-muted)',
                            marginBottom: 16
                        }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Users size={14} />
                                {course.enrollmentCount} students
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <DollarSign size={14} />
                                {course.price === 0 ? 'Free' : `$${course.price}`}
                            </span>
                        </div>

                        {/* Action Button */}
                        {isStudent && viewMode === 'enrolled' && (
                            <button
                                className="btn btn-outline"
                                style={{ width: '100%' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCardClick(course.id);
                                }}
                            >
                                Continue Learning
                            </button>
                        )}

                        {isStudent && viewMode === 'explore' && (
                            <button
                                className="btn btn-primary"
                                style={{ width: '100%' }}
                                disabled={freeEnrollMutation.isPending}
                                onClick={(e) => handleEnrollClick(e, course)}
                            >
                                {freeEnrollMutation.isPending && freeEnrollMutation.variables === course.id
                                    ? 'Enrolling...'
                                    : course.price === 0
                                        ? 'Enroll Free'
                                        : `Enroll - $${course.price}`}
                            </button>
                        )}

                        {/* View Details for non-students */}
                        {!isStudent && (
                            <button
                                className="btn btn-outline"
                                style={{ width: '100%' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCardClick(course.id);
                                }}
                            >
                                View Details
                            </button>
                        )}
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {paginatedCourses.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: 64 }}>
                    {isStudent && viewMode === 'enrolled' ? (
                        <>
                            <GraduationCap size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                            <h3 style={{ marginBottom: 8 }}>No Enrolled Courses</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
                                You haven't enrolled in any courses yet
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => handleViewModeChange('explore')}
                            >
                                <Compass size={18} />
                                Explore Courses
                            </button>
                        </>
                    ) : (
                        <>
                            <BookOpen size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                            <h3 style={{ marginBottom: 8 }}>No Courses Found</h3>
                            <p style={{ color: 'var(--text-secondary)' }}>
                                {searchTerm || priceFilter !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Check back later for new courses'}
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 32
                }}>
                    <button
                        className="btn btn-secondary"
                        disabled={currentPage === 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        style={{ padding: '8px 12px' }}
                    >
                        <ChevronLeft size={18} />
                    </button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                            pageNum = i + 1;
                        } else if (currentPage <= 3) {
                            pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                        } else {
                            pageNum = currentPage - 2 + i;
                        }
                        return (
                            <button
                                key={pageNum}
                                className={`btn ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => handlePageChange(pageNum)}
                                style={{ padding: '8px 14px', minWidth: 40 }}
                            >
                                {pageNum}
                            </button>
                        );
                    })}

                    <button
                        className="btn btn-secondary"
                        disabled={currentPage === totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        style={{ padding: '8px 12px' }}
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Modals */}
            <SubjectModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} currentUser={user} />

            {/* Payment Modal - Uses existing Stripe integration */}
            {selectedCourseId && (
                <PaymentModal
                    courseId={selectedCourseId}
                    onClose={() => setSelectedCourseId(null)}
                    onSuccess={handlePaymentSuccess}
                />
            )}
        </div>
    );
}
