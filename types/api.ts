// API request/response types

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
  timestamp: string;
}

// Error response
export interface ApiError {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  errors?: ValidationError[];
  candidates?: EntitySearchResponse<School | Professor | Course>;
  code?: string;
  details?: Record<string, unknown>;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Health check types
export interface HealthCheckResponse {
  status: "UP" | "DOWN";
  timestamp: string;
  database: "connected" | "disconnected";
}

// Future: Pagination
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
}

// Auth types
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  subscriptionTier: "FREE" | "PREMIUM";
}

// Entity types
export interface School {
  id: string;
  name: string;
  shortName?: string | null;
  aliases?: string[];
  location: string | null;
  createdAt: string;
}

export interface Professor {
  id: string;
  name: string;
  shortName?: string | null;
  aliases?: string[];
  department: string | null;
  schoolId: string;
  createdAt: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  schoolId: string;
  professorId: string;
  enrollmentCount?: number;
  createdAt: string;
}

export interface EntitySearchMatch<T> {
  item: T;
  score: number;
  strong: boolean;
}

export interface EntitySearchResponse<T> {
  matches: EntitySearchMatch<T>[];
  canCreate: boolean;
  threshold: number;
}

// Request types
export interface CreateSchoolRequest {
  name: string;
  shortName?: string;
  aliases?: string[];
  location?: string;
  confirmed?: boolean;
}

export interface CreateProfessorRequest {
  name: string;
  shortName?: string;
  aliases?: string[];
  department?: string;
  schoolId: string;
  confirmed?: boolean;
}

export interface OnboardingRequest {
  school: { id: string } | { name: string; confirmed?: boolean };
  semester: string;
  courses: Array<{
    id?: string;
    code: string;
    name: string;
    confirmed?: boolean;
    professor?: { id: string } | { name: string; confirmed?: boolean };
  }>;
}

export interface OnboardingResponse {
  schoolId: string;
  enrolled: Array<{ courseId: string; code: string; name: string }>;
}

export interface CreateCourseRequest {
  name: string;
  code: string;
  schoolId: string;
  professorId: string;
  confirmed?: boolean;
}

// Homework Q&A types
export interface HomeworkAskRequest {
  courseId: string;
  questionText: string;
}

// Conversation types
export interface Conversation {
  id: string;
  courseId: string;
  courseName: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Citation {
  materialId: string;
  fileName: string;
  score: number;
  kind: "personal" | "shared";
  page?: number;
  snippet?: string;
  previewUrl?: string;
}

export type GroundingMode = "grounded" | "partial" | "general";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  citations?: Citation[];
  mode?: GroundingMode;
  verified?: boolean;
}

export interface CreateConversationRequest {
  courseId: string;
  questionText: string;
}

export interface SendMessageRequest {
  content: string;
}

// Study Material types
export interface StudyMaterialResponse {
  id: string;
  fileName: string;
  courseName: string;
  courseId: string;
  materialType: "HOMEWORK" | "PPT" | "EXAM" | "NOTES" | "SYLLABUS";
  status: "VALIDATING" | "READY" | "REJECTED" | "QUARANTINED" | "FAILED";
  previewUrl?: string | null;
  downloadUrl?: string | null;
  contentType?: string | null;
  rejectionReason: string | null;
  embeddingError?: string | null;
  embeddingAttempts?: number;
  lastAttemptedAt?: string | null;
  createdAt: string;
}

export interface MaterialUploadResponse {
  id: string;
  status: string;
}

export type StudyGuideStatus = "queued" | "generating" | "ready" | "failed";
export type StudyGuideRetrievalMode = "personal" | "course";

export interface StudyGuideSource {
  materialId: string;
  page: number | null;
  snippet: string;
  score: number;
}

export interface StudyGuideConcept {
  id: string;
  logicalConceptId: string;
  title: string;
  category: string | null;
  summary: string;
  contentOrigin: "generated" | "user_edit" | "ai_revision";
  keyPoints: string[];
  sources: StudyGuideSource[];
}

export interface StudyGuideVersion {
  id: string;
  guideId: string;
  versionNumber: number;
  origin: "generated" | "user_edit" | "ai_revision";
  baseVersionId: string | null;
  title: string;
  summary: string;
  concepts: StudyGuideConcept[];
  createdAt: string;
}

export interface StudyGuideVersionMeta {
  id: string;
  guideId: string;
  versionNumber: number;
  origin: "generated" | "user_edit" | "ai_revision";
  baseVersionId: string | null;
  createdAt: string;
}

export interface StudyGuide {
  id: string;
  courseId: string;
  target: string;
  retrievalMode: StudyGuideRetrievalMode;
  status: StudyGuideStatus;
  errorCode: string | null;
  errorMessage: string | null;
  currentVersionId: string | null;
  discoveryStatus?: "private" | "published" | "delisted";
  publishedVersionId?: string | null;
  publishedAt?: string | null;
  currentVersion?: StudyGuideVersion | null;
  createdAt: string;
  updatedAt: string;
  readyAt?: string | null;
}

export interface StudyGuideListItem {
  id: string;
  courseId: string;
  target: string;
  retrievalMode: StudyGuideRetrievalMode;
  status: StudyGuideStatus;
  currentVersionId: string | null;
  discoveryStatus?: "private" | "published" | "delisted";
  publishedVersionId?: string | null;
  publishedAt?: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
}

export interface CreateStudyGuideResponse {
  guideId: string;
  courseId: string;
  target: string;
  retrievalMode: StudyGuideRetrievalMode;
  status: StudyGuideStatus;
  createdAt: string;
}

export interface StudyGuideRevision {
  id: string;
  guideId: string;
  baseVersionId: string;
  resultVersionId: string | null;
  status: "queued" | "running" | "completed" | "failed";
  errorCode: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface PublishedStudyGuideSummary {
  guideId: string;
  publishedVersionId: string;
  title: string;
  courseCode: string;
  target: string;
  professorName: string | null;
  topics: string[];
  groundingIndicator: "grounded" | "partial" | "general";
  publishedAt: string;
  saved: boolean;
}

export interface StudyGuideDiscoverResponse {
  results: PublishedStudyGuideSummary[];
}

export interface PublishedStudyGuide {
  id: string;
  courseId: string;
  target: string;
  publishedVersionId: string;
  publishedAt: string;
  version: StudyGuideVersion;
}

export interface StudyGuidePublicationResponse {
  guideId: string;
  publishedVersionId?: string;
  publicationStatus: "published" | "private" | "indexing";
  publishedAt?: string;
}
