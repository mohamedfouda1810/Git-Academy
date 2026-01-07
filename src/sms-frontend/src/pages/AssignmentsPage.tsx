import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { assignmentsApi, coursesApi, UserRole, SubmissionStatus, AssignmentListDto, SubmissionDto } from '../lib/api';
import { FileText, Calendar, Upload, CheckCircle, Clock, AlertCircle, Plus, Eye, Download, Trash2 } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { useState, useRef } from 'react';
import { AssignmentModal } from '../components/AssignmentModal';

export function AssignmentsPage() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const isStudent = user?.role === UserRole.Student;
    const isInstructorOrAdmin = user?.role === UserRole.Instructor || user?.role === UserRole.Admin;

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingId, setUploadingId] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [uploadError, setUploadError] = useState<string>('');
    const [showModal, setShowModal] = useState(false);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
    const [submissions, setSubmissions] = useState<SubmissionDto[]>([]);
    const [showSubmissions, setShowSubmissions] = useState(false);
    const [gradingSubmission, setGradingSubmission] = useState<SubmissionDto | null>(null);
    const [gradeValue, setGradeValue] = useState<number>(0);
    const [feedback, setFeedback] = useState('');
    const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
    const { data: assignments, isLoading, refetch } = useQuery({
        queryKey: ['myAssignments'],
        queryFn: () => assignmentsApi.getMyAssignments(),
        enabled: isStudent,
    });

    // Fetch instructor's courses for filtering
    const { data: instructorCourses } = useQuery({
        queryKey: ['instructorCourses'],
        queryFn: () => coursesApi.getMyCourses(),
        enabled: isInstructorOrAdmin,
    });

    const { data: allAssignments, refetch: refetchAll } = useQuery({
        queryKey: ['allAssignments'],
        queryFn: () => assignmentsApi.getAll({ pageSize: 50 }),
        enabled: isInstructorOrAdmin,
    });

    const gradeMutation = useMutation({
        mutationFn: ({ submissionId, score, feedback }: { submissionId: string; score: number; feedback?: string }) =>
            assignmentsApi.grade(submissionId, { score, feedback }),
        onSuccess: () => {
            setGradingSubmission(null);
            setGradeValue(0);
            setFeedback('');
            if (selectedAssignmentId) {
                handleViewSubmissions(selectedAssignmentId);
            }
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => assignmentsApi.delete(id),
        onSuccess: () => {
            refetchAll();
        },
    });

    const handleDelete = (id: string, title: string) => {
        if (window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
            deleteMutation.mutate(id);
        }
    };

    const handleFileUpload = async (assignmentId: string, file: File) => {
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            setUploadError('File size exceeds 10MB limit');
            setTimeout(() => setUploadError(''), 3000);
            return;
        }

        setUploadingId(assignmentId);
        setUploadProgress(prev => ({ ...prev, [assignmentId]: 0 }));
        setUploadError('');

        try {
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    const current = prev[assignmentId] || 0;
                    if (current < 90) {
                        return { ...prev, [assignmentId]: current + 10 };
                    }
                    return prev;
                });
            }, 200);

            await assignmentsApi.submit(assignmentId, file);

            clearInterval(progressInterval);
            setUploadProgress(prev => ({ ...prev, [assignmentId]: 100 }));

            setTimeout(() => {
                refetch();
                setUploadProgress(prev => {
                    const newProgress = { ...prev };
                    delete newProgress[assignmentId];
                    return newProgress;
                });
            }, 500);
        } catch (err: any) {
            setUploadError(err.response?.data?.message || 'Upload failed. Please try again.');
            setTimeout(() => setUploadError(''), 3000);
        } finally {
            setUploadingId(null);
        }
    };

    const handleViewSubmissions = async (assignmentId: string) => {
        try {
            const response = await assignmentsApi.getSubmissions(assignmentId);
            setSubmissions(response.data.data || []);
            setSelectedAssignmentId(assignmentId);
            setShowSubmissions(true);
        } catch (err) {
            console.error('Failed to fetch submissions', err);
        }
    };

    const handleGrade = (submission: SubmissionDto) => {
        setGradingSubmission(submission);
        setGradeValue(submission.score || 0);
        setFeedback(submission.feedback || '');
    };

    const submitGrade = () => {
        if (gradingSubmission) {
            gradeMutation.mutate({
                submissionId: gradingSubmission.id,
                score: gradeValue,
                feedback: feedback || undefined,
            });
        }
    };

    const getStatusBadge = (status?: SubmissionStatus, dueDate?: string) => {
        if (status === SubmissionStatus.Graded) return <span className="badge badge-success"><CheckCircle size={12} /> Graded</span>;
        if (status === SubmissionStatus.Submitted) return <span className="badge badge-primary">Submitted</span>;
        if (status === SubmissionStatus.Late) return <span className="badge badge-warning">Late</span>;
        if (dueDate && isPast(new Date(dueDate))) return <span className="badge badge-error"><AlertCircle size={12} /> Overdue</span>;
        return <span className="badge badge-warning"><Clock size={12} /> Pending</span>;
    };

    // Filter assignments for instructors to show only their course assignments
    const instructorCourseIds = new Set(instructorCourses?.data.data?.map(c => c.id) || []);
    const filteredInstructorAssignments = allAssignments?.data.data?.items.filter(a =>
        instructorCourseIds.has(a.courseId)
    ) || [];

    // For students: filter out graded and overdue assignments (they go to Grades page)
    const studentAssignments = assignments?.data.data?.filter((a: AssignmentListDto) => {
        const isGraded = a.mySubmissionStatus === SubmissionStatus.Graded;
        const isOverdue = a.dueDate && isPast(new Date(a.dueDate)) && !a.mySubmissionStatus;
        return !isGraded && !isOverdue;
    }) || [];

    const displayAssignments = isStudent
        ? studentAssignments
        : filteredInstructorAssignments;

    if (isLoading) {
        return <div className="loading-container"><div className="loading-spinner" /></div>;
    }

    return (
        <div className="fade-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                    <h1 className="page-title">Assignments</h1>
                    <p className="page-subtitle">
                        {isStudent ? 'View and submit your assignments' : 'Manage course assignments'}
                    </p>
                </div>
                {isInstructorOrAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={20} />
                        Create Assignment
                    </button>
                )}
            </div>

            {uploadError && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--error)',
                    borderRadius: 'var(--border-radius)',
                    padding: 12,
                    marginBottom: 16,
                    color: 'var(--error)',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    {uploadError}
                </div>
            )}

            <div className="card">
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Assignment</th>
                                <th>Course</th>
                                <th>Due Date</th>
                                <th>Max Score</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayAssignments?.map((assignment: AssignmentListDto) => (
                                <tr key={assignment.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 8,
                                                background: 'rgba(102, 126, 234, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <FileText size={20} color="var(--primary)" />
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{assignment.title}</span>
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{assignment.courseName}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Calendar size={16} color="var(--text-muted)" />
                                            {format(new Date(assignment.dueDate), 'MMM d, yyyy h:mm a')}
                                        </div>
                                    </td>
                                    <td>{assignment.maxScore} pts</td>
                                    <td>
                                        {isStudent
                                            ? (assignment.mySubmissionStatus === SubmissionStatus.Graded
                                                ? <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <CheckCircle size={12} />
                                                    {assignment.myScore !== undefined
                                                        ? `${assignment.myScore}/${assignment.maxScore}`
                                                        : 'Graded'}
                                                </span>
                                                : getStatusBadge(assignment.mySubmissionStatus, assignment.dueDate))
                                            : <span className="badge badge-primary">{assignment.submissionCount || 0} submissions</span>
                                        }
                                    </td>
                                    <td>
                                        {isStudent ? (
                                            <>
                                                {/* Show grade display for graded assignments */}
                                                {assignment.mySubmissionStatus === SubmissionStatus.Graded && (
                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '8px 16px',
                                                        background: 'rgba(16, 185, 129, 0.1)',
                                                        borderRadius: 'var(--border-radius)',
                                                        border: '1px solid var(--success)'
                                                    }}>
                                                        <CheckCircle size={18} color="var(--success)" />
                                                        <div>
                                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--success)' }}>
                                                                Score: {assignment.myScore ?? 'N/A'}/{assignment.maxScore}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Show Submitted status */}
                                                {assignment.mySubmissionStatus === SubmissionStatus.Submitted && (
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                                        Awaiting grade
                                                    </span>
                                                )}

                                                {/* Show upload for pending assignments */}
                                                {(assignment.mySubmissionStatus === undefined || assignment.mySubmissionStatus === null) && (
                                                    <>
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            style={{ display: 'none' }}
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleFileUpload(assignment.id, file);
                                                            }}
                                                        />
                                                        {uploadProgress[assignment.id] !== undefined ? (
                                                            <div style={{ minWidth: 120 }}>
                                                                <div style={{
                                                                    width: '100%',
                                                                    height: 6,
                                                                    background: 'var(--bg-tertiary)',
                                                                    borderRadius: 3,
                                                                    overflow: 'hidden',
                                                                    marginBottom: 4
                                                                }}>
                                                                    <div style={{
                                                                        width: `${uploadProgress[assignment.id]}%`,
                                                                        height: '100%',
                                                                        background: 'var(--gradient-primary)',
                                                                        transition: 'width 0.3s ease'
                                                                    }} />
                                                                </div>
                                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                                                                    {uploadProgress[assignment.id]}%
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="btn btn-outline"
                                                                style={{ padding: '8px 16px', fontSize: 13 }}
                                                                onClick={() => {
                                                                    // 1. Save this specific assignment ID to state
                                                                    setActiveAssignmentId(assignment.id);
                                                                    // 2. Open the file browser (using setTimeout to ensure state updates first)
                                                                    setTimeout(() => fileInputRef.current?.click(), 0);
                                                                }}
                                                                disabled={uploadingId === assignment.id}
                                                            >
                                                                <Upload size={16} />
                                                                {uploadingId === assignment.id ? 'Uploading...' : 'Upload'}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </>
                                        ) : (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '8px 16px', fontSize: 13 }}
                                                    onClick={() => handleViewSubmissions(assignment.id)}
                                                >
                                                    <Eye size={16} />
                                                    View
                                                </button>
                                                <button
                                                    className="btn btn-outline"
                                                    style={{ padding: '8px 16px', fontSize: 13, color: 'var(--error)', borderColor: 'var(--error)' }}
                                                    onClick={() => handleDelete(assignment.id, assignment.title)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {(!displayAssignments?.length) && (
                    <div style={{ textAlign: 'center', padding: 64 }}>
                        <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: 16 }} />
                        <h3>No Assignments</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            {isStudent ? "You're all caught up!" : "Create your first assignment to get started."}
                        </p>
                    </div>
                )}
            </div>

            {/* Create Assignment Modal */}
            {showModal && (
                <AssignmentModal
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        refetchAll();
                    }}
                />
            )}

            {/* Submissions Modal */}
            {showSubmissions && (
                <div className="modal-overlay" onClick={() => setShowSubmissions(false)}>
                    <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '80vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h2>Student Submissions</h2>
                            <button className="btn btn-secondary" onClick={() => setShowSubmissions(false)} style={{ padding: 8 }}>
                                ×
                            </button>
                        </div>

                        {submissions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                                No submissions yet
                            </div>
                        ) : (
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Submitted</th>
                                        <th>Status</th>
                                        <th>Score</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {submissions.map(sub => (
                                        <tr key={sub.id}>
                                            <td>{sub.studentName}</td>
                                            <td>{format(new Date(sub.submittedAt), 'MMM d, h:mm a')}</td>
                                            <td>{getStatusBadge(sub.status)}</td>
                                            <td>{sub.score !== undefined ? sub.score : '-'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    {sub.fileUrl && (
                                                        <a
                                                            href={`http://localhost:5000${sub.fileUrl}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-outline"
                                                            style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <Download size={14} />
                                                            Download
                                                        </a>
                                                    )}
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ padding: '6px 12px', fontSize: 12 }}
                                                        onClick={() => handleGrade(sub)}
                                                    >
                                                        Grade
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Grading Modal */}
            {gradingSubmission && (
                <div className="modal-overlay" onClick={() => setGradingSubmission(null)}>
                    <div className="modal slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h2>Grade Submission</h2>
                            <button className="btn btn-secondary" onClick={() => setGradingSubmission(null)} style={{ padding: 8 }}>
                                ×
                            </button>
                        </div>

                        <p style={{ marginBottom: 16 }}>
                            <strong>Student:</strong> {gradingSubmission.studentName}
                        </p>

                        <div className="form-group">
                            <label className="form-label">Score</label>
                            <input
                                type="number"
                                className="form-input"
                                value={gradeValue}
                                onChange={e => setGradeValue(parseInt(e.target.value) || 0)}
                                min={0}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Feedback (optional)</label>
                            <textarea
                                className="form-input"
                                value={feedback}
                                onChange={e => setFeedback(e.target.value)}
                                rows={3}
                                placeholder="Enter feedback for the student..."
                            />
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={submitGrade}
                            disabled={gradeMutation.isPending}
                            style={{ width: '100%' }}
                        >
                            {gradeMutation.isPending ? 'Saving...' : 'Save Grade'}
                        </button>
                    </div>
                    {/* === ADD THIS BLOCK AT THE VERY END === */}
           
                </div>
            )}
             <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    // Uses the state we set when clicking the button
                    if (file && activeAssignmentId) {
                        handleFileUpload(activeAssignmentId, file);
                    }
                    // Reset value to allow selecting the same file again if needed
                    e.target.value = '';
                }}
            />
        </div>
    );
}
