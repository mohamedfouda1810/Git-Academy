import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { CoursesPage } from './pages/CoursesPage';
import { CourseDetailsPage } from './pages/CourseDetailsPage';
import { CourseEnrollmentsPage } from './pages/CourseEnrollmentsPage';
import { AdminPage } from './pages/AdminPage';
import { AssignmentsPage } from './pages/AssignmentsPage';
import { QuizzesPage } from './pages/QuizzesPage';
import { ChatPage } from './pages/ChatPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { QuizTakingPage } from './pages/QuizTakingPage';
import { QuizResultsPage } from './pages/QuizResultsPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { GradesPage } from './pages/GradesPage';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 30 * 1000, // 30 seconds - data becomes stale quickly
            refetchOnWindowFocus: true, // Refetch when window regains focus
            refetchOnMount: true, // Refetch when component mounts
            refetchOnReconnect: true, // Refetch when reconnecting
        },
    },
});

function ProtectedRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function PublicRoute() {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
            </div>
        );
    }

    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public routes */}
                        <Route element={<PublicRoute />}>
                            <Route path="/login" element={<LoginPage />} />
                            <Route path="/register" element={<RegisterPage />} />
                            <Route path="/verify-email" element={<VerifyEmailPage />} />
                        </Route>

                        {/* Protected routes */}
                        <Route element={<ProtectedRoute />}>
                            <Route element={<Layout />}>
                                <Route path="/dashboard" element={<DashboardPage />} />
                                <Route path="/courses" element={<CoursesPage />} />
                                <Route path="/courses/:id" element={<CourseDetailsPage />} />
                                <Route path="/courses/:id/enrollments" element={<CourseEnrollmentsPage />} />
                                <Route path="/assignments" element={<AssignmentsPage />} />
                                <Route path="/quizzes" element={<QuizzesPage />} />
                                <Route path="/quizzes/:id/take" element={<QuizTakingPage />} />
                                <Route path="/quizzes/results/:attemptId" element={<QuizResultsPage />} />
                                <Route path="/chat" element={<ChatPage />} />
                                <Route path="/notifications" element={<NotificationsPage />} />
                                <Route path="/grades" element={<GradesPage />} />
                                <Route path="/admin" element={<AdminPage />} />
                            </Route>
                        </Route>

                        {/* Redirect root to dashboard */}
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
