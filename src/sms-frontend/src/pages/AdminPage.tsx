import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { authApi, UserRole, CreateUserRequest, UserDto } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import {
    Shield,
    UserPlus,
    Users,
    GraduationCap,
    Briefcase,
    CheckCircle,
    AlertCircle,
    Eye,
    EyeOff,
    Trash2,
    RefreshCw
} from 'lucide-react';

export function AdminPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isAdmin = user?.role === UserRole.Admin;

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: UserRole.Student
    });
    const [showPassword, setShowPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Fetch all users
    const { data: usersResponse, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
        queryKey: ['admin-users'],
        queryFn: () => authApi.getAllUsers(),
        enabled: isAdmin,
    });

    const users = usersResponse?.data?.data || [];

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: (data: CreateUserRequest) => authApi.createUser(data),
        onSuccess: () => {
            setSuccessMessage(`User "${formData.firstName} ${formData.lastName}" created successfully!`);
            setErrorMessage('');
            setFormData({
                email: '',
                password: '',
                firstName: '',
                lastName: '',
                role: UserRole.Student
            });
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setTimeout(() => setSuccessMessage(''), 5000);
        },
        onError: (error: any) => {
            setErrorMessage(error?.response?.data?.message || 'Failed to create user');
            setSuccessMessage('');
        }
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: (userId: string) => authApi.deleteUser(userId),
        onSuccess: () => {
            setSuccessMessage('User deleted successfully!');
            setDeleteConfirmId(null);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setTimeout(() => setSuccessMessage(''), 5000);
        },
        onError: (error: any) => {
            setErrorMessage(error?.response?.data?.message || 'Failed to delete user');
            setDeleteConfirmId(null);
        }
    });

    // Access control - only admins
    if (!isAdmin) {
        return (
            <div className="empty-state">
                <Shield size={48} />
                <h3>Access Denied</h3>
                <p>Only administrators can access this page.</p>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
                    Go to Dashboard
                </button>
            </div>
        );
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMessage('');
        setErrorMessage('');
        createUserMutation.mutate(formData);
    };

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDeleteClick = (userId: string) => {
        if (userId === user?.id) {
            setErrorMessage("You cannot delete your own account");
            return;
        }
        setDeleteConfirmId(userId);
    };

    const confirmDelete = () => {
        if (deleteConfirmId) {
            deleteUserMutation.mutate(deleteConfirmId);
        }
    };

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case UserRole.Admin: return <Shield size={16} />;
            case UserRole.Instructor: return <Briefcase size={16} />;
            case UserRole.Student: return <GraduationCap size={16} />;
        }
    };

    const getRoleName = (role: UserRole) => {
        switch (role) {
            case UserRole.Admin: return 'Admin';
            case UserRole.Instructor: return 'Instructor';
            case UserRole.Student: return 'Student';
        }
    };

    const getRoleBadgeClass = (role: UserRole) => {
        switch (role) {
            case UserRole.Admin: return 'badge-error';
            case UserRole.Instructor: return 'badge-primary';
            case UserRole.Student: return 'badge-success';
        }
    };

    // Stats
    const adminCount = users.filter(u => u.role === UserRole.Admin).length;
    const instructorCount = users.filter(u => u.role === UserRole.Instructor).length;
    const studentCount = users.filter(u => u.role === UserRole.Student).length;

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="page-header" style={{ marginBottom: 32 }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Shield size={32} />
                    Admin Panel
                </h1>
                <p className="page-subtitle">
                    Manage users and system settings
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-4" style={{ marginBottom: 32 }}>
                <div className="stat-card">
                    <div className="stat-icon primary">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{users.length}</div>
                        <div className="stat-label">Total Users</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon error">
                        <Shield size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{adminCount}</div>
                        <div className="stat-label">Admins</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon info">
                        <Briefcase size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{instructorCount}</div>
                        <div className="stat-label">Instructors</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon success">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <div className="stat-value">{studentCount}</div>
                        <div className="stat-label">Students</div>
                    </div>
                </div>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
                <div style={{
                    padding: 16,
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid var(--success)',
                    borderRadius: 'var(--border-radius)',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <CheckCircle size={20} color="var(--success)" />
                    <span style={{ color: 'var(--success)', fontWeight: 500 }}>{successMessage}</span>
                </div>
            )}

            {errorMessage && (
                <div style={{
                    padding: 16,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid var(--error)',
                    borderRadius: 'var(--border-radius)',
                    marginBottom: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <AlertCircle size={20} color="var(--error)" />
                    <span style={{ color: 'var(--error)', fontWeight: 500 }}>{errorMessage}</span>
                </div>
            )}

            <div className="grid grid-2" style={{ gap: 24 }}>
                {/* Create User Form */}
                <div className="card">
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <UserPlus size={24} />
                        Create New User
                    </h2>

                    <form onSubmit={handleSubmit}>
                        {/* Name Fields */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                            <div className="form-group">
                                <label className="form-label">First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    placeholder="Enter first name"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    placeholder="Enter last name"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="user@example.com"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={(e) => handleInputChange('password', e.target.value)}
                                    placeholder="Enter password"
                                    required
                                    style={{ paddingRight: 48 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: 12,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div className="form-group" style={{ marginBottom: 24 }}>
                            <label className="form-label">User Role</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                {[UserRole.Student, UserRole.Instructor, UserRole.Admin].map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => handleInputChange('role', role)}
                                        style={{
                                            padding: 12,
                                            border: formData.role === role
                                                ? '2px solid var(--primary)'
                                                : '2px solid var(--border-color)',
                                            borderRadius: 'var(--border-radius)',
                                            background: formData.role === role
                                                ? 'rgba(139, 92, 246, 0.1)'
                                                : 'var(--bg-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: 6,
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{
                                            color: formData.role === role ? 'var(--primary)' : 'var(--text-secondary)'
                                        }}>
                                            {getRoleIcon(role)}
                                        </div>
                                        <span style={{
                                            fontSize: 13,
                                            fontWeight: formData.role === role ? 600 : 400,
                                            color: formData.role === role ? 'var(--primary)' : 'var(--text-primary)'
                                        }}>
                                            {getRoleName(role)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createUserMutation.isPending}
                            style={{ width: '100%' }}
                        >
                            <UserPlus size={18} />
                            {createUserMutation.isPending ? 'Creating User...' : 'Create User'}
                        </button>
                    </form>
                </div>

                {/* Users List */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: 20, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                            <Users size={24} />
                            All Users ({users.length})
                        </h2>
                        <button
                            className="btn btn-secondary"
                            onClick={() => refetchUsers()}
                            disabled={usersLoading}
                            style={{ padding: '8px 12px' }}
                        >
                            <RefreshCw size={16} className={usersLoading ? 'spin' : ''} />
                        </button>
                    </div>

                    {usersLoading ? (
                        <div style={{ padding: 48, textAlign: 'center' }}>
                            <div className="loading-spinner" />
                        </div>
                    ) : users.length === 0 ? (
                        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                            No users found
                        </div>
                    ) : (
                        <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-tertiary)' }}>
                                        <th style={{ padding: 12, textAlign: 'left', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>User</th>
                                        <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Role</th>
                                        <th style={{ padding: 12, textAlign: 'center', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u: UserDto, index: number) => (
                                        <tr key={u.id} style={{ background: index % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                                            <td style={{ padding: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: '50%',
                                                        background: 'var(--gradient-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        fontWeight: 600,
                                                        fontSize: 13
                                                    }}>
                                                        {u.firstName[0]}{u.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 500, fontSize: 14 }}>{u.firstName} {u.lastName}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: 12, textAlign: 'center' }}>
                                                <span className={`badge ${getRoleBadgeClass(u.role)}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    {getRoleIcon(u.role)}
                                                    {getRoleName(u.role)}
                                                </span>
                                            </td>
                                            <td style={{ padding: 12, textAlign: 'center' }}>
                                                {u.id !== user?.id ? (
                                                    <button
                                                        className="btn btn-secondary"
                                                        onClick={() => handleDeleteClick(u.id)}
                                                        style={{ padding: '6px 10px', color: 'var(--error)' }}
                                                        disabled={deleteUserMutation.isPending}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>You</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deleteConfirmId && (
                <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <div style={{
                                width: 60,
                                height: 60,
                                borderRadius: '50%',
                                background: 'rgba(239, 68, 68, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Trash2 size={28} color="var(--error)" />
                            </div>
                            <h3 style={{ marginBottom: 8 }}>Delete User?</h3>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                                This will permanently delete the user and all their related data (enrollments, courses, submissions, etc.). This action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setDeleteConfirmId(null)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="btn"
                                    onClick={confirmDelete}
                                    disabled={deleteUserMutation.isPending}
                                    style={{ background: 'var(--error)', color: 'white' }}
                                >
                                    <Trash2 size={16} />
                                    {deleteUserMutation.isPending ? 'Deleting...' : 'Delete User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
