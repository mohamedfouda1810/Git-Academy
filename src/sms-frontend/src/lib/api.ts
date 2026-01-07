import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const accessToken = localStorage.getItem('accessToken');

        if (refreshToken && accessToken) {
          const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
            accessToken,
            refreshToken,
          });

          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data.data;
          
          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: RegisterRequest) => api.post<ApiResponse<AuthResponse>>('/auth/register', data),
  login: (data: LoginRequest) => api.post<ApiResponse<AuthResponse>>('/auth/login', data),
  googleLogin: (idToken: string) => api.post<ApiResponse<AuthResponse>>('/auth/google', { idToken }),
  refresh: (data: RefreshTokenRequest) => api.post<ApiResponse<AuthResponse>>('/auth/refresh', data),
  verifyEmail: (userId: string, token: string) => api.post<ApiResponse<null>>('/auth/verify-email', { userId, token }),
  createUser: (data: CreateUserRequest) => api.post<ApiResponse<UserDto>>('/auth/admin/users', data),
  createInstructor: (data: CreateInstructorRequest) => api.post<ApiResponse<UserDto>>('/auth/admin/create-instructor', data),
  getAllUsers: () => api.get<ApiResponse<UserDto[]>>('/auth/admin/users'),
  deleteUser: (id: string) => api.delete<ApiResponse<void>>(`/auth/admin/users/${id}`),
};

// Courses API (formerly Subjects)
export const coursesApi = {
  getAll: (params?: CourseFilterRequest) => api.get<ApiResponse<PagedResponse<CourseListDto>>>('/courses', { params }),
  getById: (id: string) => api.get<ApiResponse<CourseDetailsDto | CoursePreviewDto>>(`/courses/${id}`),
  getPreview: (id: string) => api.get<ApiResponse<CoursePreviewDto>>(`/courses/${id}/preview`),
  getDetails: (id: string) => api.get<ApiResponse<CourseDetailsDto>>(`/courses/${id}/details`),
  create: (data: CreateCourseRequest) => api.post<ApiResponse<CourseDto>>('/courses', data),
  update: (id: string, data: UpdateCourseRequest) => api.put<ApiResponse<CourseDto>>(`/courses/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse<void>>(`/courses/${id}`),
  enroll: (data: EnrollmentRequest) => api.post<ApiResponse<EnrollmentDto>>('/courses/enroll', data),
  unenroll: (courseId: string) => api.delete<ApiResponse<void>>(`/courses/${courseId}/unenroll`),
  getMyEnrollments: () => api.get<ApiResponse<EnrollmentDto[]>>('/courses/my-enrollments'),
  getMyCourses: () => api.get<ApiResponse<CourseListDto[]>>('/courses/my-courses'),
  getCourseEnrollments: (courseId: string) => api.get<ApiResponse<EnrollmentDto[]>>(`/courses/${courseId}/enrollments`),
  setFinalGrade: (enrollmentId: string, grade: number) => api.post<ApiResponse<void>>(`/courses/enrollments/${enrollmentId}/grade`, { grade }),
  
  // Sessions
  getSessions: (courseId: string) => api.get<ApiResponse<SessionDto[]>>(`/courses/${courseId}/sessions`),
  getSession: (courseId: string, sessionId: string) => api.get<ApiResponse<SessionDto>>(`/courses/${courseId}/sessions/${sessionId}`),
  createSession: (courseId: string, data: CreateSessionRequest) => api.post<ApiResponse<SessionDto>>(`/courses/${courseId}/sessions`, data),
  updateSession: (courseId: string, sessionId: string, data: UpdateSessionRequest) => api.put<ApiResponse<SessionDto>>(`/courses/${courseId}/sessions/${sessionId}`, data),
  deleteSession: (courseId: string, sessionId: string) => api.delete<ApiResponse<void>>(`/courses/${courseId}/sessions/${sessionId}`),
  uploadSessionContent: (courseId: string, sessionId: string, file: File, type: 'pdf' | 'video') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<SessionDto>>(`/courses/${courseId}/sessions/${sessionId}/upload?type=${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  createSessionQuiz: (courseId: string, sessionId: string, data: CreateSessionQuizRequest) => 
    api.post<ApiResponse<QuizDto>>(`/courses/${courseId}/sessions/${sessionId}/quiz`, data),
};

// Payments API
export const paymentsApi = {
  createIntent: (courseId: string) => api.post<ApiResponse<PaymentDto>>(`/payment/create-intent/${courseId}`),
  getHistory: () => api.get<ApiResponse<PaymentDto[]>>('/payment/history'),
};

// Assignments API
export const assignmentsApi = {
  getAll: (params?: { courseId?: string } & PagedRequest) => 
    api.get<ApiResponse<PagedResponse<AssignmentListDto>>>('/assignments', { params }),
  getById: (id: string) => api.get<ApiResponse<AssignmentDto>>(`/assignments/${id}`),
  create: (data: CreateAssignmentRequest) => api.post<ApiResponse<AssignmentDto>>('/assignments', data),
  getMyAssignments: () => api.get<ApiResponse<AssignmentListDto[]>>('/assignments/my-assignments'),
  submit: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<SubmissionDto>>(`/assignments/${id}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getSubmissions: (id: string) => api.get<ApiResponse<SubmissionDto[]>>(`/assignments/${id}/submissions`),
  getMySubmission: (id: string) => api.get<ApiResponse<SubmissionDto>>(`/assignments/${id}/my-submission`),
  grade: (submissionId: string, data: GradeSubmissionRequest) => 
    api.post<ApiResponse<SubmissionDto>>(`/assignments/submissions/${submissionId}/grade`, data),
  delete: (id: string) => api.delete<ApiResponse<void>>(`/assignments/${id}`),
};

// Quizzes API
export const quizzesApi = {
  getAll: (params?: { courseId?: string } & PagedRequest) => 
    api.get<ApiResponse<PagedResponse<QuizListDto>>>('/quizzes', { params }),
  getById: (id: string) => api.get<ApiResponse<QuizDto>>(`/quizzes/${id}`),
  create: (data: CreateQuizRequest) => api.post<ApiResponse<QuizDto>>('/quizzes', data),
  getForTaking: (id: string) => api.get<ApiResponse<QuizDetailDto>>(`/quizzes/${id}/take`),
  start: (id: string) => api.post<ApiResponse<StartQuizAttemptResponse>>(`/quizzes/${id}/start`),
  submit: (data: SubmitQuizRequest) => api.post<ApiResponse<QuizAttemptResultDto>>('/quizzes/submit', data),
  getAttemptResult: (attemptId: string) => api.get<ApiResponse<QuizAttemptResultDto>>(`/quizzes/attempts/${attemptId}`),
  getMyAttempts: (quizId?: string) => api.get<ApiResponse<QuizAttemptResultDto[]>>('/quizzes/my-attempts', { params: { quizId } }),
  getQuizAttempts: (id: string) => api.get<ApiResponse<QuizAttemptResultDto[]>>(`/quizzes/${id}/attempts`),
  delete: (id: string) => api.delete<ApiResponse<void>>(`/quizzes/${id}`),
};

// Chat API
export const chatApi = {
  getConversations: () => api.get<ApiResponse<ConversationDto[]>>('/chat/conversations'),
  getContacts: () => api.get<ApiResponse<ChatContactDto[]>>('/chat/contacts'),
  getMessages: (otherUserId: string, take = 50, skip = 0) => 
    api.get<ApiResponse<ChatMessageDto[]>>(`/chat/messages/${otherUserId}`, { params: { take, skip } }),
  sendMessage: (data: SendMessageRequest) => api.post<ApiResponse<ChatMessageDto>>('/chat/send', data),
  markAsRead: (senderId: string) => api.post<ApiResponse<void>>('/chat/mark-read', { senderId }),
  getUnreadCount: () => api.get<ApiResponse<number>>('/chat/unread-count'),
};

// Notifications API
export const notificationsApi = {
  getAll: (unreadOnly = false) => api.get<ApiResponse<NotificationDto[]>>('/notifications', { params: { unreadOnly } }),
  getUnreadCount: () => api.get<ApiResponse<number>>('/notifications/unread-count'),
  markAsRead: (id: string) => api.post<ApiResponse<void>>(`/notifications/${id}/read`),
  markAllAsRead: () => api.post<ApiResponse<void>>('/notifications/read-all'),
  delete: (id: string) => api.delete<ApiResponse<void>>(`/notifications/${id}`),
};

// Grades API
export const gradesApi = {
  getMyGrades: () => api.get<ApiResponse<StudentGradesDto>>('/grades/my-grades'),
  getCourseGrades: (courseId: string) => api.get<ApiResponse<CourseGradeSummaryDto>>(`/grades/course/${courseId}`),
  getInstructorGrades: () => api.get<ApiResponse<InstructorGradesDto>>('/grades/instructor-grades'),
};

// ==================== TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface PagedRequest {
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Auth Types
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  accessToken: string;
  refreshToken: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface CreateInstructorRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: UserDto;
}

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  profilePictureUrl?: string;
  emailConfirmed: boolean;
}

export enum UserRole {
  Admin = 0,
  Instructor = 1,
  Student = 2,
}

// Course Types
export interface CourseFilterRequest extends PagedRequest {
  semester?: string;
  year?: number;
  minPrice?: number;
  maxPrice?: number;
  instructorId?: string;
}

export interface CourseListDto {
  id: string;
  code: string;
  name: string;
  previewDescription: string;
  thumbnailUrl?: string;
  price: number;
  instructorName: string;
  enrollmentCount: number;
}

export interface CoursePreviewDto {
  id: string;
  code: string;
  name: string;
  previewDescription: string;
  thumbnailUrl?: string;
  price: number;
  instructorName: string;
  enrollmentCount: number;
}

export interface CourseDetailsDto {
  id: string;
  code: string;
  name: string;
  description: string;
  previewDescription?: string;
  thumbnailUrl?: string;
  price: number;
  credits: number;
  semester: string;
  year: number;
  instructorId: string;
  instructorName: string;
  enrollmentCount: number;
  sessions: SessionListDto[];
  hasAccess: boolean;  // Backend determines if user has access
  isEnrolled: boolean;
  hasPaid: boolean;
}

export interface CourseDto {
  id: string;
  code: string;
  name: string;
  description?: string;
  previewDescription?: string;
  thumbnailUrl?: string;
  credits: number;
  semester: string;
  year: number;
  price: number;
  isActive: boolean;
  instructorId: string;
  instructorName: string;
  enrollmentCount: number;
  createdAt: string;
}

export interface CreateCourseRequest {
  code: string;
  name: string;
  description?: string;
  previewDescription?: string;
  thumbnailUrl?: string;
  credits: number;
  semester: string;
  year: number;
  price: number;
  instructorId: string;
}

export interface UpdateCourseRequest {
  name?: string;
  description?: string;
  previewDescription?: string;
  thumbnailUrl?: string;
  credits?: number;
  semester?: string;
  year?: number;
  price?: number;
  isActive?: boolean;
}

// Session Types
export interface SessionListDto {
  id: string;
  title: string;
  order: number;
  hasQuiz: boolean;
}

export interface SessionDto {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  pdfUrl?: string;
  videoUrl?: string;
  hasQuiz: boolean;
  quiz?: SessionQuizDto;
}

export interface SessionQuizDto {
  quizId: string;
  title: string;
  questionCount: number;
}

export interface CreateSessionRequest {
  title: string;
  description: string;
  order: number;
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  order?: number;
}

export interface CreateSessionQuizRequest {
  title: string;
  description?: string;
  durationMinutes: number;
  questions: CreateQuizQuestionRequest[];
}

// Enrollment Types
export interface EnrollmentRequest {
  courseId: string;
}

export interface EnrollmentDto {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string;
  courseName: string;
  enrolledAt: string;
  finalGrade?: number;
  isActive: boolean;
}

// Payment Types
export interface PaymentDto {
  id: string;
  userId: string;
  courseId: string;
  amount: number;
  currency: string;
  status: string;
  stripePaymentIntentId: string;
  clientSecret: string;
  createdAt: string;
}

// Assignment Types
export interface AssignmentDto {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  maxScore: number;
  allowedFileTypes?: string;
  isActive: boolean;
  courseId: string;
  courseName: string;
  createdById: string;
  createdByName: string;
  submissionCount: number;
  createdAt: string;
}

export interface AssignmentListDto {
  id: string;
  title: string;
  dueDate: string;
  maxScore: number;
  courseId: string;
  courseName: string;
  submissionCount: number;
  mySubmissionStatus?: SubmissionStatus;
  myScore?: number; // Score for student's graded submission
}

export interface CreateAssignmentRequest {
  title: string;
  description?: string;
  dueDate: string;
  maxScore: number;
  allowedFileTypes?: string;
  courseId: string;
}

export interface SubmissionDto {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  fileName: string;
  fileUrl?: string;  // Path for downloading the submission file
  fileSizeBytes: number;
  submittedAt: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
}

export interface GradeSubmissionRequest {
  score: number;
  feedback?: string;
}

export enum SubmissionStatus {
  Pending = 0,
  Submitted = 1,
  Late = 2,
  Graded = 3,
}

// Quiz Types
export interface QuizDto {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  totalMarks: number;
  isActive: boolean;
  shuffleQuestions: boolean;
  maxAttempts?: number;
  courseId: string;
  courseName: string;
  questionCount: number;
  attemptCount: number;
  createdAt: string;
}

export interface QuizListDto {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  courseName: string;
  hasAttempted: boolean;
  myAttemptId?: string;
  myScore?: number;
}

export interface CreateQuizRequest {
  title: string;
  description?: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  shuffleQuestions: boolean;
  maxAttempts?: number;
  courseId: string;
  questions: CreateQuizQuestionRequest[];
}

export interface CreateQuizQuestionRequest {
  questionText: string;
  questionType: QuestionType;
  marks: number;
  order: number;
  options?: string[];
  correctAnswer: string;
}

export enum QuestionType {
  MultipleChoice = 0,
  TrueFalse = 1,
  ShortAnswer = 2,
}

export interface QuizDetailDto {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  totalMarks: number;
  questions: QuizQuestionDto[];
}

export interface QuizQuestionDto {
  id: string;
  questionText: string;
  questionType: QuestionType;
  marks: number;
  order: number;
  options?: string[];
}

export interface StartQuizAttemptResponse {
  attemptId: string;
  startedAt: string;
  mustSubmitBy: string;
  questions: QuizQuestionDto[];
}

export interface SubmitQuizRequest {
  attemptId: string;
  answers: QuizAnswerRequest[];
}

export interface QuizAnswerRequest {
  questionId: string;
  answer: string;
}

export interface QuizAttemptResultDto {
  attemptId: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  startedAt: string;
  submittedAt?: string;
  score: number;
  percentage: number;
  totalMarks: number;
  answers?: QuizAnswerResultDto[];
}

export interface QuizAnswerResultDto {
  questionId: string;
  questionText: string;
  yourAnswer?: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
}

// Chat Types
export interface ChatMessageDto {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  courseId?: string;
  courseName?: string;
}

export interface ConversationDto {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: UserRole;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ChatContactDto {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: UserRole;
  courseName?: string;
}

export interface SendMessageRequest {
  receiverId: string;
  content: string;
  courseId?: string;
}

// Notification Types
export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  referenceId?: string;
  referenceType?: string;
  createdAt: string;
}

export enum NotificationType {
  QuizAvailable = 0,
  AssignmentDue = 1,
  NewMessage = 2,
  GradePosted = 3,
  Announcement = 4,
  EnrollmentConfirmed = 5,
  CourseUpdate = 6,
}

// Grade Types
export interface GradeItemDto {
  id: string;
  itemType: 'Assignment' | 'Quiz';
  itemTitle: string;
  courseId: string;
  courseName: string;
  score: number;
  maxScore: number;
  percentage: number;
  gradedAt: string;
}

export interface CourseGradeSummaryDto {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalEarned: number;
  totalPossible: number;
  percentage: number;
  assignmentCount: number;
  quizCount: number;
  grades: GradeItemDto[];
}

export interface StudentGradesDto {
  courses: CourseGradeSummaryDto[];
  overallTotalEarned: number;
  overallTotalPossible: number;
  overallPercentage: number;
}

// Instructor Grade Types
export interface StudentGradeSummaryDto {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalEarned: number;
  totalPossible: number;
  percentage: number;
  completedAssignments: number;
  completedQuizzes: number;
}

export interface InstructorCourseGradesDto {
  courseId: string;
  courseName: string;
  courseCode: string;
  enrolledCount: number;
  students: StudentGradeSummaryDto[];
}

export interface InstructorGradesDto {
  courses: InstructorCourseGradesDto[];
}
