import { Session, Event, EventType } from './index';

// Base WebSocket message structure
export interface BaseWebSocketMessage {
  id: string;
  timestamp: string;
  type: string;
  payload: any;
}

// Events Service WebSocket Messages
export interface SessionUpdatedMessage extends BaseWebSocketMessage {
  type: 'session.updated';
  payload: {
    session: Session;
    previousStatus?: string;
    previousStage?: number;
  };
}

export interface SessionCreatedMessage extends BaseWebSocketMessage {
  type: 'session.created';
  payload: {
    session: Session;
  };
}

export interface SessionCompletedMessage extends BaseWebSocketMessage {
  type: 'session.completed';
  payload: {
    session: Session;
    bookingConfirmed: boolean;
  };
}

export interface EventReceivedMessage extends BaseWebSocketMessage {
  type: 'event.received';
  payload: {
    event: Event;
    sessionId: string;
  };
}

export interface BatchEventsMessage extends BaseWebSocketMessage {
  type: 'events.batch';
  payload: {
    events: Event[];
    sessionId: string;
  };
}

// Analytics Service WebSocket Messages
export interface MetricsUpdatedMessage extends BaseWebSocketMessage {
  type: 'metrics.updated';
  payload: {
    activeSessions: number;
    sessionsLastHour: number;
    eventsLastMinute: number;
    conversionRate: number;
    avgSessionDuration: number;
  };
}

export interface FunnelUpdatedMessage extends BaseWebSocketMessage {
  type: 'funnel.updated';
  payload: {
    stages: Array<{
      stage: number;
      name: string;
      count: number;
      percentage: number;
    }>;
  };
}

export interface TopListsUpdatedMessage extends BaseWebSocketMessage {
  type: 'toplists.updated';
  payload: {
    destinations: Array<{ name: string; count: number; percentage: number }>;
    hotels: Array<{ name: string; count: number; percentage: number }>;
    sources: Array<{ name: string; count: number; percentage: number }>;
  };
}

// Alert Messages
export interface AlertMessage extends BaseWebSocketMessage {
  type: 'alert';
  payload: {
    severity: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    metadata?: Record<string, any>;
  };
}

// System Messages
export interface HeartbeatMessage extends BaseWebSocketMessage {
  type: 'PING' | 'PONG';
  payload: null;
}

export interface ConnectionStatusMessage extends BaseWebSocketMessage {
  type: 'connection.status';
  payload: {
    status: 'connected' | 'disconnected' | 'reconnecting';
    activeConnections?: number;
  };
}

// Union type for all WebSocket messages
export type EventsWebSocketMessage = 
  | SessionUpdatedMessage
  | SessionCreatedMessage
  | SessionCompletedMessage
  | EventReceivedMessage
  | BatchEventsMessage
  | MetricsUpdatedMessage
  | FunnelUpdatedMessage
  | TopListsUpdatedMessage
  | AlertMessage
  | HeartbeatMessage
  | ConnectionStatusMessage;

// Type guards
export function isSessionMessage(message: BaseWebSocketMessage): message is SessionUpdatedMessage | SessionCreatedMessage | SessionCompletedMessage {
  return message.type.startsWith('session.');
}

export function isEventMessage(message: BaseWebSocketMessage): message is EventReceivedMessage | BatchEventsMessage {
  return message.type.startsWith('event') || message.type === 'events.batch';
}

export function isMetricsMessage(message: BaseWebSocketMessage): message is MetricsUpdatedMessage | FunnelUpdatedMessage | TopListsUpdatedMessage {
  return message.type === 'metrics.updated' || message.type === 'funnel.updated' || message.type === 'toplists.updated';
}

export function isAlertMessage(message: BaseWebSocketMessage): message is AlertMessage {
  return message.type === 'alert';
}