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
  lastLogin?: Date;
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
  metadata?: {
    originalEventType: string;
    icon: string;
    color: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    category: string;
  };
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

// 28 Canonical Event Types
export enum EventType {
  // Widget Lifecycle Events
  WIDGET_INITIALIZED = "widget_initialized",
  IBE_LAUNCHED = "ibe_launched", 
  BOOKING_ENGINE_MINIMIZED = "booking_engine_minimized",
  BOOKING_ENGINE_RESTORED = "booking_engine_restored",
  BOOKING_ENGINE_EXITED = "booking_engine_exited",
  
  // Date Interaction Events
  CHECKIN_DATE_SELECTED = "checkin_date_selected",
  CHECKOUT_DATE_SELECTED = "checkout_date_selected", 
  SINGLE_DATE_CLEARED = "single_date_cleared",
  ALL_DATES_CLEARED = "all_dates_cleared",
  CALENDAR_NAVIGATION = "calendar_navigation",
  
  // Navigation Events
  GUEST_ROOM_TAB_SELECTED = "guest_room_tab_selected",
  DATE_TAB_SELECTED = "date_tab_selected",
  NAVIGATION_BACK = "navigation_back",
  
  // Search & Modification Events  
  GUEST_COUNT_CHANGED = "guest_count_changed",
  ROOM_COUNT_CHANGED = "room_count_changed",
  SEARCH_SUBMITTED = "search_submitted",
  SEARCH_MODIFIED = "search_modified",
  
  // Selection & Viewing Events
  ROOM_TYPE_SELECTED = "room_type_selected",
  ROOM_RATE_SELECTED = "room_rate_selected", 
  ROOM_DETAILS_VIEWED = "room_details_viewed",
  RATE_DETAILS_VIEWED = "rate_details_viewed",
  POLICY_DETAILS_VIEWED = "policy_details_viewed",
  COST_BREAKDOWN_VIEWED = "cost_breakdown_viewed",
  
  // Booking Process Events
  ROOM_BOOKING_INITIATED = "room_booking_initiated",
  PAYMENT_METHOD_SELECTED = "payment_method_selected",
  PAYMENT_DETAILS_COMPLETED = "payment_details_completed", 
  GUEST_DETAILS_COMPLETED = "guest_details_completed",
  RESERVATION_CONFIRMED = "reservation_confirmed"
}

// Event categorization for UI organization
export const EVENT_CATEGORIES = {
  widget_lifecycle: [
    EventType.WIDGET_INITIALIZED,
    EventType.IBE_LAUNCHED,
    EventType.BOOKING_ENGINE_MINIMIZED,
    EventType.BOOKING_ENGINE_RESTORED,
    EventType.BOOKING_ENGINE_EXITED
  ],
  date_interaction: [
    EventType.CHECKIN_DATE_SELECTED,
    EventType.CHECKOUT_DATE_SELECTED,
    EventType.SINGLE_DATE_CLEARED,
    EventType.ALL_DATES_CLEARED,
    EventType.CALENDAR_NAVIGATION
  ],
  navigation: [
    EventType.GUEST_ROOM_TAB_SELECTED,
    EventType.DATE_TAB_SELECTED,
    EventType.NAVIGATION_BACK
  ],
  search_modification: [
    EventType.GUEST_COUNT_CHANGED,
    EventType.ROOM_COUNT_CHANGED,
    EventType.SEARCH_SUBMITTED,
    EventType.SEARCH_MODIFIED
  ],
  selection_viewing: [
    EventType.ROOM_TYPE_SELECTED,
    EventType.ROOM_RATE_SELECTED,
    EventType.ROOM_DETAILS_VIEWED,
    EventType.RATE_DETAILS_VIEWED,
    EventType.POLICY_DETAILS_VIEWED,
    EventType.COST_BREAKDOWN_VIEWED
  ],
  booking_process: [
    EventType.ROOM_BOOKING_INITIATED,
    EventType.PAYMENT_METHOD_SELECTED,
    EventType.PAYMENT_DETAILS_COMPLETED,
    EventType.GUEST_DETAILS_COMPLETED,
    EventType.RESERVATION_CONFIRMED
  ]
} as const;

// Event metadata for UI display
export const EVENT_METADATA: Record<EventType, {
  label: string;
  description: string;
  icon: string;
  color: string;
  category: keyof typeof EVENT_CATEGORIES;
  importance: 'low' | 'medium' | 'high' | 'critical';
}> = {
  [EventType.WIDGET_INITIALIZED]: {
    label: 'Widget Initialized',
    description: 'User loaded the booking widget',
    icon: 'power_settings_new',
    color: '#4caf50',
    category: 'widget_lifecycle',
    importance: 'medium'
  },
  [EventType.IBE_LAUNCHED]: {
    label: 'Booking Engine Opened',
    description: 'User opened the booking interface',
    icon: 'open_in_browser',
    color: '#2196f3',
    category: 'widget_lifecycle', 
    importance: 'high'
  },
  [EventType.BOOKING_ENGINE_MINIMIZED]: {
    label: 'Widget Minimized',
    description: 'User minimized the booking widget',
    icon: 'minimize',
    color: '#ff9800',
    category: 'widget_lifecycle',
    importance: 'low'
  },
  [EventType.BOOKING_ENGINE_RESTORED]: {
    label: 'Widget Restored',
    description: 'User restored the booking widget',
    icon: 'open_in_full',
    color: '#4caf50',
    category: 'widget_lifecycle',
    importance: 'low'
  },
  [EventType.BOOKING_ENGINE_EXITED]: {
    label: 'Widget Exited',
    description: 'User closed/exited the booking widget',
    icon: 'close',
    color: '#f44336',
    category: 'widget_lifecycle',
    importance: 'medium'
  },
  [EventType.CHECKIN_DATE_SELECTED]: {
    label: 'Check-in Selected',
    description: 'User selected check-in date',
    icon: 'calendar_today',
    color: '#9c27b0',
    category: 'date_interaction',
    importance: 'high'
  },
  [EventType.CHECKOUT_DATE_SELECTED]: {
    label: 'Check-out Selected', 
    description: 'User selected check-out date',
    icon: 'event_available',
    color: '#9c27b0',
    category: 'date_interaction',
    importance: 'high'
  },
  [EventType.SINGLE_DATE_CLEARED]: {
    label: 'Date Cleared',
    description: 'User cleared a single date selection',
    icon: 'clear',
    color: '#ff5722',
    category: 'date_interaction',
    importance: 'low'
  },
  [EventType.ALL_DATES_CLEARED]: {
    label: 'All Dates Cleared',
    description: 'User cleared all date selections',
    icon: 'clear_all',
    color: '#ff5722',
    category: 'date_interaction',
    importance: 'medium'
  },
  [EventType.CALENDAR_NAVIGATION]: {
    label: 'Calendar Navigation',
    description: 'User navigated within the calendar',
    icon: 'navigate_next',
    color: '#795548',
    category: 'date_interaction',
    importance: 'low'
  },
  [EventType.GUEST_ROOM_TAB_SELECTED]: {
    label: 'Guest/Room Tab',
    description: 'User selected guest/room configuration tab',
    icon: 'people',
    color: '#607d8b',
    category: 'navigation',
    importance: 'medium'
  },
  [EventType.DATE_TAB_SELECTED]: {
    label: 'Date Tab',
    description: 'User selected date selection tab',
    icon: 'date_range',
    color: '#607d8b',
    category: 'navigation',
    importance: 'medium'
  },
  [EventType.NAVIGATION_BACK]: {
    label: 'Navigation Back',
    description: 'User navigated back in the booking flow',
    icon: 'arrow_back',
    color: '#9e9e9e',
    category: 'navigation',
    importance: 'low'
  },
  [EventType.GUEST_COUNT_CHANGED]: {
    label: 'Guest Count Changed',
    description: 'User modified the number of guests',
    icon: 'group_add',
    color: '#03a9f4',
    category: 'search_modification',
    importance: 'high'
  },
  [EventType.ROOM_COUNT_CHANGED]: {
    label: 'Room Count Changed',
    description: 'User modified the number of rooms',
    icon: 'meeting_room',
    color: '#03a9f4',
    category: 'search_modification',
    importance: 'high'
  },
  [EventType.SEARCH_SUBMITTED]: {
    label: 'Search Submitted',
    description: 'User submitted availability search',
    icon: 'search',
    color: '#2196f3',
    category: 'search_modification',
    importance: 'critical'
  },
  [EventType.SEARCH_MODIFIED]: {
    label: 'Search Modified',
    description: 'User modified existing search parameters',
    icon: 'edit',
    color: '#03a9f4',
    category: 'search_modification',
    importance: 'high'
  },
  [EventType.ROOM_TYPE_SELECTED]: {
    label: 'Room Type Selected',
    description: 'User selected a specific room type',
    icon: 'hotel',
    color: '#4caf50',
    category: 'selection_viewing',
    importance: 'critical'
  },
  [EventType.ROOM_RATE_SELECTED]: {
    label: 'Room Rate Selected',
    description: 'User selected a specific rate for a room',
    icon: 'local_offer',
    color: '#4caf50',
    category: 'selection_viewing',
    importance: 'critical'
  },
  [EventType.ROOM_DETAILS_VIEWED]: {
    label: 'Room Details Viewed',
    description: 'User viewed detailed room information',
    icon: 'info',
    color: '#00bcd4',
    category: 'selection_viewing',
    importance: 'medium'
  },
  [EventType.RATE_DETAILS_VIEWED]: {
    label: 'Rate Details Viewed',
    description: 'User viewed detailed rate information',
    icon: 'receipt',
    color: '#00bcd4',
    category: 'selection_viewing',
    importance: 'medium'
  },
  [EventType.POLICY_DETAILS_VIEWED]: {
    label: 'Policy Details Viewed',
    description: 'User viewed booking policy details',
    icon: 'policy',
    color: '#00bcd4',
    category: 'selection_viewing',
    importance: 'low'
  },
  [EventType.COST_BREAKDOWN_VIEWED]: {
    label: 'Cost Breakdown Viewed',
    description: 'User viewed detailed cost breakdown',
    icon: 'account_balance_wallet',
    color: '#00bcd4',
    category: 'selection_viewing',
    importance: 'medium'
  },
  [EventType.ROOM_BOOKING_INITIATED]: {
    label: 'Booking Initiated',
    description: 'User started the room booking process',
    icon: 'book_online',
    color: '#ff9800',
    category: 'booking_process',
    importance: 'critical'
  },
  [EventType.PAYMENT_METHOD_SELECTED]: {
    label: 'Payment Method Selected',
    description: 'User selected payment method',
    icon: 'payment',
    color: '#ff9800',
    category: 'booking_process',
    importance: 'critical'
  },
  [EventType.PAYMENT_DETAILS_COMPLETED]: {
    label: 'Payment Details Completed',
    description: 'User completed payment information',
    icon: 'credit_card',
    color: '#ff9800',
    category: 'booking_process',
    importance: 'critical'
  },
  [EventType.GUEST_DETAILS_COMPLETED]: {
    label: 'Guest Details Completed',
    description: 'User completed guest information',
    icon: 'person_add',
    color: '#ff9800',
    category: 'booking_process',
    importance: 'critical'
  },
  [EventType.RESERVATION_CONFIRMED]: {
    label: 'Reservation Confirmed',
    description: 'User completed booking successfully',
    icon: 'check_circle',
    color: '#4caf50',
    category: 'booking_process',
    importance: 'critical'
  }
};

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