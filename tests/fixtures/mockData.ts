import { DashboardMetrics, Session, AnalyticsEvent, FunnelStage } from '../../src/types';

// Mock Dashboard Metrics (deterministic data)
export const mockDashboardMetrics: DashboardMetrics = {
  activeUsers: 42,
  totalSearches: 1567,
  totalBookings: 234,
  conversionRate: 14.9,
  abandonmentRate: 31.2,
  averageSessionDuration: 342, // seconds
  averageLeadTime: 12, // days
  topDestinations: [
    { destination: 'Santa Barbara', count: 145, percentage: 23.4 },
    { destination: 'Monterey', count: 132, percentage: 21.3 },
    { destination: 'Carmel', count: 98, percentage: 15.8 },
    { destination: 'Half Moon Bay', count: 76, percentage: 12.3 },
    { destination: 'Sausalito', count: 54, percentage: 8.7 },
  ],
  topHotels: [
    {
      hotel: 'The Ballard Inn & Restaurant',
      searches: 234,
      bookings: 34,
      conversionRate: 14.5,
    },
    {
      hotel: 'Garden Street Inn',
      searches: 198,
      bookings: 28,
      conversionRate: 14.1,
    },
    {
      hotel: 'The Upham Hotel',
      searches: 167,
      bookings: 21,
      conversionRate: 12.6,
    },
  ],
  funnelStats: [
    { stage: 'Visitors', count: 1000, percentage: 100.0, dropOffRate: 0 },
    { stage: 'Destination Search', count: 850, percentage: 85.0, dropOffRate: 15.0 },
    { stage: 'Hotel Selection', count: 680, percentage: 68.0, dropOffRate: 20.0 },
    { stage: 'Date Selection', count: 544, percentage: 54.4, dropOffRate: 20.0 },
    { stage: 'Room Selection', count: 435, percentage: 43.5, dropOffRate: 20.0 },
    { stage: 'Guest Details', count: 348, percentage: 34.8, dropOffRate: 20.0 },
    { stage: 'Add-ons', count: 313, percentage: 31.3, dropOffRate: 10.0 },
    { stage: 'Review Booking', count: 281, percentage: 28.1, dropOffRate: 10.2 },
    { stage: 'Payment', count: 225, percentage: 22.5, dropOffRate: 19.9 },
    { stage: 'Confirmation', count: 203, percentage: 20.3, dropOffRate: 9.8 },
  ],
};

// Mock Sessions Data
export const mockSessions: Session[] = [
  {
    sessionId: 'sess_test_001',
    userId: 'user_test_001',
    hotel: 'The Ballard Inn & Restaurant',
    destination: 'Santa Barbara',
    status: 'LIVE',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:45:00Z',
    checkInDate: '2024-02-01',
    checkOutDate: '2024-02-03',
    guests: 2,
    rooms: 1,
    selectedRoomType: 'King Suite',
    totalPrice: 450.00,
    currentStage: 5,
    completedStages: ['destination', 'hotel', 'dates', 'room', 'guests'],
  },
  {
    sessionId: 'sess_test_002',
    userId: 'user_test_002',
    hotel: 'Garden Street Inn',
    destination: 'Monterey',
    status: 'ABANDONED',
    createdAt: '2024-01-15T09:15:00Z',
    updatedAt: '2024-01-15T09:32:00Z',
    currentStage: 3,
    completedStages: ['destination', 'hotel', 'dates'],
    abandonmentStage: 'room_selection',
  },
  {
    sessionId: 'sess_test_003',
    userId: 'user_test_003',
    hotel: 'The Upham Hotel',
    destination: 'Santa Barbara',
    status: 'CONFIRMED_BOOKING',
    createdAt: '2024-01-15T08:45:00Z',
    updatedAt: '2024-01-15T09:15:00Z',
    checkInDate: '2024-01-25',
    checkOutDate: '2024-01-27',
    guests: 1,
    rooms: 1,
    selectedRoomType: 'Standard Queen',
    totalPrice: 275.00,
    currentStage: 10,
    completedStages: [
      'destination', 'hotel', 'dates', 'room', 'guests', 
      'addons', 'review', 'payment', 'confirmation'
    ],
  },
];

// Mock Analytics Events
export const mockAnalyticsEvents: AnalyticsEvent[] = [
  {
    eventId: 'evt_test_001',
    sessionId: 'sess_test_001',
    eventType: 'DESTINATION_SEARCH',
    timestamp: '2024-01-15T10:30:15Z',
    data: {
      destination: 'Santa Barbara',
      searchFilters: { priceRange: 'mid', dates: '2024-02-01' }
    },
  },
  {
    eventId: 'evt_test_002',
    sessionId: 'sess_test_001',
    eventType: 'HOTEL_VIEW',
    timestamp: '2024-01-15T10:32:22Z',
    data: {
      hotel: 'The Ballard Inn & Restaurant',
      viewDuration: 45,
    },
  },
  {
    eventId: 'evt_test_003',
    sessionId: 'sess_test_002',
    eventType: 'SESSION_ABANDONED',
    timestamp: '2024-01-15T09:32:45Z',
    data: {
      abandonmentStage: 'room_selection',
      timeOnSite: 1020, // seconds
    },
  },
];

// Mock Funnel Data
export const mockFunnelStages: FunnelStage[] = [
  { name: 'Visitors', count: 1000, percentage: 100.0, dropOff: 0 },
  { name: 'Destination Search', count: 850, percentage: 85.0, dropOff: 15.0 },
  { name: 'Hotel Selection', count: 680, percentage: 68.0, dropOff: 20.0 },
  { name: 'Date Selection', count: 544, percentage: 54.4, dropOff: 20.0 },
  { name: 'Room Selection', count: 435, percentage: 43.5, dropOff: 20.0 },
  { name: 'Guest Details', count: 348, percentage: 34.8, dropOff: 20.0 },
  { name: 'Add-ons', count: 313, percentage: 31.3, dropOff: 10.0 },
  { name: 'Review Booking', count: 281, percentage: 28.1, dropOff: 10.2 },
  { name: 'Payment', count: 225, percentage: 22.5, dropOff: 19.9 },
  { name: 'Confirmation', count: 203, percentage: 20.3, dropOff: 9.8 },
];

// Mock Heatmap Data
export const mockHeatmapData = [
  { date: '2024-01-15', hour: 9, value: 45, intensity: 'medium' as const },
  { date: '2024-01-15', hour: 10, value: 67, intensity: 'high' as const },
  { date: '2024-01-15', hour: 11, value: 89, intensity: 'high' as const },
  { date: '2024-01-15', hour: 12, value: 34, intensity: 'low' as const },
  { date: '2024-01-15', hour: 13, value: 56, intensity: 'medium' as const },
  { date: '2024-01-16', hour: 9, value: 23, intensity: 'low' as const },
  { date: '2024-01-16', hour: 10, value: 78, intensity: 'high' as const },
  { date: '2024-01-16', hour: 11, value: 45, intensity: 'medium' as const },
];

// Mock WebSocket Messages
export const mockWebSocketMessages = {
  CONNECTION_ESTABLISHED: {
    type: 'CONNECTION_ESTABLISHED' as const,
    payload: { sessionId: 'test-ws-session' },
    timestamp: '2024-01-15T10:30:00Z',
    id: 'ws_msg_001',
  },
  METRICS_UPDATE: {
    type: 'METRICS_UPDATE' as const,
    payload: { activeUsers: 47, timestamp: '2024-01-15T10:31:00Z' },
    timestamp: '2024-01-15T10:31:00Z',
    id: 'ws_msg_002',
  },
  SESSION_UPDATE: {
    type: 'SESSION_UPDATE' as const,
    payload: mockSessions[0],
    timestamp: '2024-01-15T10:32:00Z',
    id: 'ws_msg_003',
  },
};

// Mock API Error Responses
export const mockApiErrors = {
  UNAUTHORIZED: {
    message: 'Unauthorized access',
    status: 401,
    code: 'UNAUTHORIZED',
  },
  NOT_FOUND: {
    message: 'Resource not found',
    status: 404,
    code: 'NOT_FOUND',
  },
  SERVER_ERROR: {
    message: 'Internal server error',
    status: 500,
    code: 'INTERNAL_ERROR',
  },
};