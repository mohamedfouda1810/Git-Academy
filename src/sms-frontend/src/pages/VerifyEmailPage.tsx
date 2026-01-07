import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { authApi } from '../lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Verifying your email...');

    const userId = searchParams.get('userId');
    const token = searchParams.get('token');

    useEffect(() => {
        if (!userId || !token) {
            setStatus('error');
            setMessage('Invalid verification link. Please check your email and try again.');
            return;
        }

        const verify = async () => {
            try {
                // The token from URL is already encoded, but the backend expects it.
                // However, axios/browser might decode it automatically depending on how it's passed.
                // Let's pass it as is, the api wrapper handles object structure.
                // Note: The backend uses HttpUtility.UrlDecode, so we should ensure we send it correctly.
                // If we send it via JSON body, it should be the raw string.

                // Construct the DTO expected by backend: { userId: string, token: string }
                await authApi.verifyEmail(userId, token);

                setStatus('success');
                setMessage('Your email has been successfully verified! You can now log in.');

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 5000);
            } catch (err: any) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Email verification failed. The link may have expired.');
            }
        };

        verify();
    }, [userId, token, navigate]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            padding: 24
        }}>
            <div className="card" style={{
                padding: 48,
                width: '100%',
                maxWidth: 480,
                textAlign: 'center'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 24
                }}>
                    {status === 'loading' && (
                        <>
                            <Loader2 size={64} className="spin" style={{ color: 'var(--primary)' }} />
                            <h1 style={{ fontSize: 24 }}>Verifying...</h1>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div style={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: 'var(--gradient-success)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'pulse 1.5s ease-in-out infinite'
                            }}>
                                <CheckCircle size={40} color="white" />
                            </div>
                            <h1 style={{ fontSize: 24 }}>Email Verified!</h1>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div style={{
                                width: 80,
                                height: 80,
                                borderRadius: '50%',
                                background: 'var(--error)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <XCircle size={40} color="white" />
                            </div>
                            <h1 style={{ fontSize: 24 }}>Verification Failed</h1>
                        </>
                    )}

                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {message}
                    </p>

                    {status !== 'loading' && (
                        <Link to="/login" className="btn btn-primary" style={{ marginTop: 16 }}>
                            Go to Login
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
