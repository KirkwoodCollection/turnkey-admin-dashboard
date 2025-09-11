import { z } from 'zod';
import { 
  SystemHealthResponse, 
  HealthHistoryPoint, 
  ServiceDependency, 
  IntegrationTestSuite,
  ServiceHealthStatus,
  IntegrationTestResult
} from '../api/systemHealth';

// Re-export health-related types for convenience
export type { 
  SystemHealthResponse, 
  HealthHistoryPoint, 
  ServiceDependency, 
  IntegrationTestSuite,
  ServiceHealthStatus,
  IntegrationTestResult
};

// Validation schemas
export const SessionSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  hotel: z.string(),
  destination: z.string(),
  status: z.enum(['LIVE', 'DORMANT', 'CONFIRMED_BOOKING', 'ABANDONED']),
  createdAt: z.string(),
  updatedAt: z.string(),
  checkInDate: z.string().optional(),
  checkOutDate: z.string().optional(),
  guests: z.number().optional(),
  rooms: z.number().optional(),
  selectedRoomType: z.string().optional(),
  totalPrice: z.number().optional(),
  currentStage: z.number(),
  completedStages: z.array(z.string()),
  abandonmentStage: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export type Session = z.infer<typeof SessionSchema>;

export const AnalyticsEventSchema = z.object({
  eventId: z.string(),
  sessionId: z.string(),
  eventType: z.string(),
  timestamp: z.string(),
  data: z.record(z.any()),
  userAgent: z.string().optional(),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

export interface DashboardMetrics {
  activeUsers: number;
  totalSearches: number;
  totalBookings: number;
  conversionRate: number;
  abandonmentRate: number;
  averageSessionDuration: number;
  averageLeadTime: number;
  topDestinations: Array<{
    destination: string;
    count: number;
    percentage: number;
  }>;
  topHotels: Array<{
    hotel: string;
    searches: number;
    bookings: number;
    conversionRate: number;
  }>;
  funnelStats: Array<{
    stage: string;
    count: number;
    percentage: number;
    dropOffRate: number;
  }>;
}

export interface WebSocketMessage {
  type: 'SESSION_UPDATE' | 'NEW_EVENT' | 'METRICS_UPDATE' | 'USER_COUNT' | 'HEALTH_UPDATE' | 'ERROR' | 'PING' | 'PONG';
  payload: unknown;
  timestamp: string;
  id: string; // For deduplication
}

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropOff?: number;
}

export interface HeatmapData {
  date: string;
  hour: number;
  value: number;
  intensity: 'low' | 'medium' | 'high';
}

export interface TimeFilter {
  label: string;
  value: string;
  hours: number;
}

export interface User {
  uid: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  displayName?: string;
  photoURL?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Chart data interfaces
export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'funnel' | 'heatmap';
  data: unknown[];
  options?: Record<string, unknown>;
}

export interface ActivityRecord {
  id: string;
  sessionId: string;
  event: string;
  timestamp: string;
  details: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

// Error types
export class ApiError extends Error {
  public status: number;
  public code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class WebSocketError extends Error {
  public code?: string;
  public reconnectable: boolean;

  constructor(message: string, code?: string, reconnectable = true) {
    super(message);
    this.name = 'WebSocketError';
    this.code = code;
    this.reconnectable = reconnectable;
  }
}

// Constants
export const TIME_FILTERS: TimeFilter[] = [
  { label: '1H', value: '1h', hours: 1 },
  { label: '6H', value: '6h', hours: 6 },
  { label: '12H', value: '12h', hours: 12 },
  { label: '24H', value: '24h', hours: 24 },
  { label: '7D', value: '7d', hours: 168 },
  { label: '30D', value: '30d', hours: 720 },
];

export const FUNNEL_STAGES = [
  'Visitors',
  'Destination Search', 
  'Hotel Selection',
  'Date Selection',
  'Room Selection',
  'Guest Details',
  'Add-ons',
  'Review Booking',
  'Payment',
  'Confirmation'
] as const;

export type FunnelStageName = typeof FUNNEL_STAGES[number];

export const SESSION_STATUS_COLORS = {
  LIVE: '#4caf50',
  DORMANT: '#ff9800', 
  CONFIRMED_BOOKING: '#2196f3',
  ABANDONED: '#f44336',
} as const;

// System Health Types
export interface HealthAlert {
  id: string;
  service_name: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolution_time?: string;
}

export interface HealthDashboardState {
  systemHealth: SystemHealthResponse | null;
  healthHistory: HealthHistoryPoint[];
  dependencies: ServiceDependency[];
  integrationTests: IntegrationTestSuite | null;
  metrics: SystemMetrics | null;
  alerts: HealthAlert[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

export interface SystemMetrics {
  timestamp: string;
  overall_response_time: number;
  error_rate: number;
  uptime_percentage: number;
  active_services: number;
  critical_alerts: number;
  warning_alerts: number;
  service_metrics: Array<{
    service_name: string;
    avg_response_time: number;
    error_rate: number;
    uptime_percentage: number;
    request_count: number;
  }>;
}

export type HealthStatus = 'healthy' | 'unhealthy' | 'degraded';

export const HEALTH_STATUS_COLORS = {
  healthy: '#4caf50',
  degraded: '#ff9800',
  unhealthy: '#f44336',
} as const;

export const HEALTH_STATUS_LABELS = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  unhealthy: 'Unhealthy',
} as const;