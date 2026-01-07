import { SessionDto, SessionListDto, UserRole } from '../lib/api';
import { ChevronDown, FileText, Video, HelpCircle, Download, Play, Edit, Trash2, Lock } from 'lucide-react';
import { useState } from 'react';

interface SessionAccordionProps {
    sessions: (SessionDto | SessionListDto)[];
    canAccess: boolean;
    isInstructor?: boolean;
    courseId?: string;
    onStartQuiz?: (quizId: string) => void;
    onEditSession?: (session: SessionDto) => void;
    onDeleteSession?: (sessionId: string) => void;
}

// Type guard to check if session has content info
const isFullSession = (session: SessionDto | SessionListDto): session is SessionDto => {
    return 'pdfUrl' in session || 'videoUrl' in session || 'description' in session;
};

export function SessionAccordion({
    sessions,
    canAccess,
    isInstructor = false,
    courseId,
    onStartQuiz,
    onEditSession,
    onDeleteSession
}: SessionAccordionProps) {
    const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

    const toggleSession = (sessionId: string) => {
        const newExpanded = new Set(expandedSessions);
        if (newExpanded.has(sessionId)) {
            newExpanded.delete(sessionId);
        } else {
            newExpanded.add(sessionId);
        }
        setExpandedSessions(newExpanded);
    };

    // Construct proper file URL with API prefix
    const getFileUrl = (path: string) => {
        if (!path) return '';
        // If path already has /api/files, return as-is
        if (path.startsWith('/api/files/')) return `http://localhost:5000${path}`;
        // If path starts with http/https, return as-is
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        // Otherwise, add /api/files prefix
        return `http://localhost:5000/api/files/${path.replace(/^\//, '')}`;
    };

    const handleDownload = (url: string, filename: string) => {
        const fullUrl = getFileUrl(url);
        const link = document.createElement('a');
        link.href = `${fullUrl.replace('/api/files/', '/api/files/download/')}`;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePlayVideo = (url: string) => {
        window.open(getFileUrl(url), '_blank');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {sessions.map((session, index) => {
                const isExpanded = expandedSessions.has(session.id);
                const fullSession = isFullSession(session) ? session : null;

                return (
                    <div
                        key={session.id}
                        className="card"
                        style={{ padding: 0, overflow: 'hidden' }}
                    >
                        {/* Session Header */}
                        <div
                            style={{
                                width: '100%',
                                padding: 24,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                        >
                            <div
                                onClick={() => toggleSession(session.id)}
                                style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}
                            >
                                <div style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    background: 'var(--gradient-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: 18,
                                    flexShrink: 0
                                }}>
                                    {session.order}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                                        {session.title}
                                    </h3>
                                    <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                                        {fullSession?.pdfUrl && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <FileText size={14} />
                                                PDF
                                            </span>
                                        )}
                                        {fullSession?.videoUrl && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Video size={14} />
                                                Video
                                            </span>
                                        )}
                                        {session.hasQuiz && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <HelpCircle size={14} />
                                                Quiz
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Instructor Actions - Now outside the toggle area */}
                            {isInstructor && (
                                <div style={{ display: 'flex', gap: 8, marginRight: 16 }}>
                                    {fullSession && onEditSession && (
                                        <button
                                            className="btn btn-outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditSession(fullSession);
                                            }}
                                            style={{ padding: '6px 12px' }}
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {onDeleteSession && (
                                        <button
                                            className="btn btn-outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Are you sure you want to delete this session?')) {
                                                    onDeleteSession(session.id);
                                                }
                                            }}
                                            style={{ padding: '6px 12px', borderColor: 'var(--error)', color: 'var(--error)' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            )}

                            <ChevronDown
                                onClick={() => toggleSession(session.id)}
                                size={24}
                                style={{
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.3s ease',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer'
                                }}
                            />
                        </div>

                        {/* Session Content */}
                        {isExpanded && (
                            <div
                                className="slide-up"
                                style={{
                                    padding: '0 24px 24px 24px',
                                    borderTop: '1px solid var(--border-color)'
                                }}
                            >
                                {!canAccess && !isInstructor ? (
                                    <div style={{
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid var(--warning)',
                                        borderRadius: 'var(--border-radius)',
                                        padding: 16,
                                        marginTop: 16,
                                        color: 'var(--warning)',
                                        textAlign: 'center',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8
                                    }}>
                                        <Lock size={18} />
                                        Enroll in this course to access session content
                                    </div>
                                ) : (
                                    <div className="slide-up" style={{ marginTop: 20 }}>
                                        {/* Description */}
                                        {fullSession?.description && (
                                            <p style={{
                                                color: 'var(--text-secondary)',
                                                marginBottom: 20,
                                                lineHeight: 1.6
                                            }}>
                                                {fullSession.description}
                                            </p>
                                        )}

                                        {/* Content Buttons */}
                                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                                            {/* PDF Download/View */}
                                            {fullSession?.pdfUrl && (
                                                <button
                                                    className="btn btn-outline"
                                                    onClick={() => handleDownload(fullSession.pdfUrl!, `${session.title}.pdf`)}
                                                    style={{ gap: 8 }}
                                                >
                                                    <Download size={18} />
                                                    Download PDF
                                                </button>
                                            )}

                                            {/* Video View */}
                                            {fullSession?.videoUrl && (
                                                <button
                                                    className="btn btn-outline"
                                                    onClick={() => handlePlayVideo(fullSession.videoUrl!)}
                                                    style={{ gap: 8 }}
                                                >
                                                    <Play size={18} />
                                                    Watch Video
                                                </button>
                                            )}
                                        </div>

                                        {session.hasQuiz && fullSession?.quiz && onStartQuiz && (
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => onStartQuiz(fullSession.quiz!.quizId)}
                                                style={{ width: '100%' }}
                                            >
                                                <HelpCircle size={18} />
                                                Take Session Quiz
                                            </button>
                                        )}

                                        {/* No content message */}
                                        {!fullSession?.pdfUrl && !fullSession?.videoUrl && !session.hasQuiz && (
                                            <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
                                                {isInstructor
                                                    ? 'No content uploaded yet. Click edit to add content.'
                                                    : 'No content available for this session yet.'}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
