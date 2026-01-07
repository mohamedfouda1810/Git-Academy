import { useState, useEffect } from 'react';
import { paymentsApi, coursesApi, CoursePreviewDto } from '../lib/api';
import { X, CreditCard, Check, AlertCircle, Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentModalProps {
    courseId: string;
    onClose: () => void;
    onSuccess: () => void;
}

const CheckoutForm = ({ clientSecret, course, onSuccess }: { clientSecret: string; course: CoursePreviewDto; onSuccess: () => void }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [name, setName] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) return;

        setIsProcessing(true);
        setError('');

        const result = await stripe.confirmCardPayment(clientSecret, {
            payment_method: {
                card: elements.getElement(CardElement)!,
                billing_details: {
                    name: name,
                },
            },
        });

        if (result.error) {
            setError(result.error.message || 'Payment failed');
            setIsProcessing(false);
        } else {
            if (result.paymentIntent.status === 'succeeded') {
                // Payment success, enroll user
                try {
                    await coursesApi.enroll({ courseId: course.id });
                    onSuccess();
                } catch (err) {
                    setError('Payment succeeded but enrollment failed. Please contact support.');
                    setIsProcessing(false);
                }
            }
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Cardholder Name</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Name on card"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label">Card Details</label>
                <div style={{
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius)',
                    background: 'var(--bg-primary)'
                }}>
                    <CardElement options={{
                        style: {
                            base: {
                                fontSize: '16px',
                                color: '#424770',
                                '::placeholder': {
                                    color: '#aab7c4',
                                },
                            },
                            invalid: {
                                color: '#9e2146',
                            },
                        },
                    }} />
                </div>
            </div>

            {error && (
                <div style={{ color: 'var(--error)', marginBottom: 16, fontSize: 14 }}>
                    {error}
                </div>
            )}

            <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={!stripe || isProcessing}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="spin" size={18} style={{ marginRight: 8 }} />
                        Processing...
                    </>
                ) : (
                    `Pay $${course.price.toFixed(2)}`
                )}
            </button>
        </form>
    );
};

export function PaymentModal({ courseId, onClose, onSuccess }: PaymentModalProps) {
    const [course, setCourse] = useState<CoursePreviewDto | null>(null);
    const [clientSecret, setClientSecret] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                // Load course
                const courseRes = await coursesApi.getPreview(courseId);
                setCourse(courseRes.data.data!);

                // Create intent
                const paymentRes = await paymentsApi.createIntent(courseId);
                if (paymentRes.data.data?.clientSecret) {
                    setClientSecret(paymentRes.data.data.clientSecret);
                } else {
                    setError('Failed to initialize payment');
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load details');
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, [courseId]);

    const handleSuccess = () => {
        setSuccess(true);
        setTimeout(() => {
            onSuccess();
            onClose();
        }, 2000);
    };

    if (isLoading || !course) {
        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div className="loading-container">
                        <div className="loading-spinner" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
                <div className="modal-header">
                    <h2 className="modal-title">Enroll in Course</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'var(--gradient-success)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }}>
                            <Check size={40} color="white" />
                        </div>
                        <h3 style={{ marginBottom: 12 }}>Enrollment Successful!</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            You're now enrolled in {course.name}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Course Info */}
                        <div style={{
                            background: 'var(--bg-tertiary)',
                            borderRadius: 'var(--border-radius)',
                            padding: 20,
                            marginBottom: 24
                        }}>
                            <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                                <div style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: 'var(--border-radius)',
                                    background: 'var(--gradient-cool)',
                                    flexShrink: 0,
                                    overflow: 'hidden'
                                }}>
                                    {course.thumbnailUrl && (
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    )}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span className="badge badge-primary" style={{ marginBottom: 8 }}>
                                        {course.code}
                                    </span>
                                    <h3 style={{ fontSize: 18, marginBottom: 4 }}>{course.name}</h3>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {course.instructorName}
                                    </p>
                                </div>
                            </div>

                            <div style={{
                                borderTop: '1px solid var(--border-color)',
                                paddingTop: 16,
                                marginTop: 16
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: 16, fontWeight: 600 }}>Total Amount</span>
                                    <div className="price-tag">${course.price.toFixed(2)}</div>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid var(--error)',
                                borderRadius: 'var(--border-radius)',
                                padding: 12,
                                marginBottom: 20,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                color: 'var(--error)'
                            }}>
                                <AlertCircle size={20} />
                                {error}
                            </div>
                        )}

                        {clientSecret && (
                            <Elements stripe={stripePromise} options={{ clientSecret }}>
                                <CheckoutForm
                                    clientSecret={clientSecret}
                                    course={course}
                                    onSuccess={handleSuccess}
                                />
                            </Elements>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
