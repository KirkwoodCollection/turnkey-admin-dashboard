import React from 'react';
import { useEvents } from '../contexts/EventsContext';
import { useAdminWebSocket, useEventsWebSocketFallback } from '../utils/env';

interface WebSocketStatusProps {
  className?: string;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ className = '' }) => {
  const { isConnected, connectionError, connectionType } = useEvents();
  const isAdminWSEnabled = useAdminWebSocket();
  const isFallbackEnabled = useEventsWebSocketFallback();

  const getStatusColor = () => {
    if (isConnected) {
      return connectionType === 'admin' ? 'text-green-600' : 'text-yellow-600';
    }
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (isConnected) {
      return connectionType === 'admin' ? '🔒' : '⚠️';
    }
    return '❌';
  };

  const getStatusText = () => {
    if (!isConnected) {
      return connectionError ? `Disconnected: ${connectionError.message}` : 'Disconnected';
    }

    if (connectionType === 'admin') {
      return 'Connected to Admin WebSocket';
    }

    if (connectionType === 'events') {
      return isFallbackEnabled ? 'Fallback: Events WebSocket' : 'Connected to Events WebSocket';
    }

    return 'Connected';
  };

  const getConfigInfo = () => {
    const parts = [];
    if (isAdminWSEnabled) parts.push('Admin WS: ON');
    if (isFallbackEnabled) parts.push('Fallback: ON');
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-lg">{getStatusIcon()}</span>
      <div className="flex flex-col">
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        {(isAdminWSEnabled || isFallbackEnabled) && (
          <span className="text-xs text-gray-500">
            {getConfigInfo()}
          </span>
        )}
      </div>
    </div>
  );
};