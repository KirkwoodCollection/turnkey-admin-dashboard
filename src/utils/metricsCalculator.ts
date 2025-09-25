import { Session, AnalyticsEvent, EventType, EVENT_METADATA, EVENT_CATEGORIES } from '../types';

export const metricsCalculator = {
  /**
   * Calculate conversion rate from sessions to bookings
   */
  calculateConversionRate(sessions: Session[]): number {
    if (!sessions || sessions.length === 0) return 0;
    const bookings = sessions.filter(s => s.status === 'CONFIRMED_BOOKING').length;
    return Number(((bookings / sessions.length) * 100).toFixed(2));
  },

  /**
   * Calculate abandonment rate from sessions
   */
  calculateAbandonmentRate(sessions: Session[]): number {
    if (!sessions || sessions.length === 0) return 0;
    const abandoned = sessions.filter(s => s.status === 'ABANDONED').length;
    return Number(((abandoned / sessions.length) * 100).toFixed(2));
  },

  /**
   * Calculate average session duration in seconds
   */
  calculateAverageSessionDuration(sessions: Session[]): number {
    if (!sessions || sessions.length === 0) return 0;
    
    const durations = sessions
      .filter(s => s.createdAt && s.updatedAt)
      .map(s => {
        const start = new Date(s.createdAt).getTime();
        const end = new Date(s.updatedAt).getTime();
        return (end - start) / 1000; // Convert to seconds
      });
    
    if (durations.length === 0) return 0;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  },

  /**
   * Calculate average lead time from booking to check-in in days
   */
  calculateAverageLeadTime(sessions: Session[]): number {
    const bookingsWithDates = sessions.filter(
      s => s.status === 'CONFIRMED_BOOKING' && s.checkInDate
    );
    
    if (bookingsWithDates.length === 0) return 0;
    
    const leadTimes = bookingsWithDates.map(s => {
      const booking = new Date(s.createdAt);
      const checkIn = new Date(s.checkInDate!);
      return Math.floor((checkIn.getTime() - booking.getTime()) / (1000 * 60 * 60 * 24));
    });
    
    return Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length);
  },

  /**
   * Aggregate sessions by destination with percentages
   */
  aggregateByDestination(sessions: Session[]): Array<{ 
    destination: string; 
    count: number; 
    percentage: number; 
  }> {
    if (!sessions || sessions.length === 0) return [];
    
    const destinationCounts = sessions.reduce((acc, session) => {
      acc[session.destination] = (acc[session.destination] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const total = sessions.length;
    return Object.entries(destinationCounts)
      .map(([destination, count]) => ({ 
        destination, 
        count, 
        percentage: Number(((count / total) * 100).toFixed(1))
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  },

  /**
   * Aggregate sessions by hotel with search/booking metrics
   */
  aggregateByHotel(sessions: Session[]): Array<{ 
    hotel: string; 
    searches: number; 
    bookings: number;
    conversionRate: number;
  }> {
    if (!sessions || sessions.length === 0) return [];
    
    const hotelData = sessions.reduce((acc, session) => {
      if (!acc[session.hotel]) {
        acc[session.hotel] = { searches: 0, bookings: 0 };
      }
      acc[session.hotel].searches++;
      if (session.status === 'CONFIRMED_BOOKING') {
        acc[session.hotel].bookings++;
      }
      return acc;
    }, {} as Record<string, { searches: number; bookings: number }>);
    
    return Object.entries(hotelData)
      .map(([hotel, data]) => ({ 
        hotel, 
        ...data,
        conversionRate: data.searches > 0 
          ? Number(((data.bookings / data.searches) * 100).toFixed(1))
          : 0
      }))
      .sort((a, b) => b.searches - a.searches)
      .slice(0, 10);
  },

  /**
   * Calculate funnel conversion rates
   */
  calculateFunnelMetrics(sessions: Session[]): Array<{
    stage: string;
    count: number;
    percentage: number;
    dropOffRate: number;
  }> {
    if (!sessions || sessions.length === 0) return [];
    
    const stages = [
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
    ];
    
    // Mock funnel data based on sessions - in real app this would come from events
    const totalVisitors = sessions.length;
    let previousCount = totalVisitors;
    
    return stages.map((stage, index) => {
      // Simulate realistic drop-off rates
      const dropOffRates = [0, 0.15, 0.25, 0.12, 0.18, 0.08, 0.05, 0.10, 0.20, 0.02];
      const dropOff = dropOffRates[index] || 0;
      
      const count = index === 0 
        ? totalVisitors 
        : Math.floor(previousCount * (1 - dropOff));
      
      const percentage = Number(((count / totalVisitors) * 100).toFixed(1));
      const dropOffRate = Number((dropOff * 100).toFixed(1));
      
      previousCount = count;
      
      return {
        stage,
        count,
        percentage,
        dropOffRate
      };
    });
  },

  /**
   * Calculate hourly activity intensity for heatmap
   */
  calculateHourlyActivity(events: AnalyticsEvent[]): Array<{
    date: string;
    hour: number;
    value: number;
    intensity: 'low' | 'medium' | 'high';
  }> {
    if (!events || events.length === 0) return [];
    
    const hourlyData = events.reduce((acc, event) => {
      const date = new Date(event.timestamp);
      const dateStr = date.toISOString().split('T')[0];
      const hour = date.getHours();
      const key = `${dateStr}-${hour}`;
      
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const maxValue = Math.max(...Object.values(hourlyData));
    
    return Object.entries(hourlyData).map(([key, value]) => {
      const [date, hourStr] = key.split('-');
      const hour = parseInt(hourStr);
      
      let intensity: 'low' | 'medium' | 'high';
      if (value < maxValue * 0.3) intensity = 'low';
      else if (value < maxValue * 0.7) intensity = 'medium';
      else intensity = 'high';
      
      return {
        date,
        hour,
        value,
        intensity
      };
    });
  },

  // Enhanced 28-Event Analytics Methods

  /**
   * Calculate event-based conversion rate using 28 canonical events
   */
  calculateEventBasedConversionRate(events: AnalyticsEvent[]): {
    rate: number;
    totalSessions: number;
    conversions: number;
  } {
    if (!events || events.length === 0) return { rate: 0, totalSessions: 0, conversions: 0 };

    const sessionsWithWidget = new Set(
      events.filter(e => e.eventType === EventType.WIDGET_INITIALIZED).map(e => e.sessionId)
    );
    const sessionsWithConfirmation = new Set(
      events.filter(e => e.eventType === EventType.RESERVATION_CONFIRMED).map(e => e.sessionId)
    );

    const totalSessions = sessionsWithWidget.size;
    const conversions = sessionsWithConfirmation.size;
    const rate = totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;

    return {
      rate: Number(rate.toFixed(2)),
      totalSessions,
      conversions
    };
  },

  /**
   * Calculate user engagement metrics by event categories
   */
  calculateCategoryEngagement(events: AnalyticsEvent[]): Array<{
    category: string;
    eventCount: number;
    uniqueUsers: number;
    averageEventsPerUser: number;
    engagementScore: number;
  }> {
    if (!events || events.length === 0) return [];

    const categoryStats = new Map<string, {
      events: AnalyticsEvent[];
      uniqueUsers: Set<string>;
    }>();

    // Group events by category
    events.forEach(event => {
      for (const [category, categoryEvents] of Object.entries(EVENT_CATEGORIES)) {
        if (categoryEvents.some(eventType => eventType === event.eventType)) {
          if (!categoryStats.has(category)) {
            categoryStats.set(category, { events: [], uniqueUsers: new Set() });
          }
          const stats = categoryStats.get(category)!;
          stats.events.push(event);
          stats.uniqueUsers.add(event.sessionId);
        }
      }
    });

    return Array.from(categoryStats.entries()).map(([category, stats]) => {
      const eventCount = stats.events.length;
      const uniqueUsers = stats.uniqueUsers.size;
      const averageEventsPerUser = uniqueUsers > 0 ? eventCount / uniqueUsers : 0;
      
      // Calculate engagement score based on event frequency and importance
      const importanceWeights = { critical: 4, high: 3, medium: 2, low: 1 };
      const weightedScore = stats.events.reduce((sum, event) => {
        const metadata = EVENT_METADATA[event.eventType as EventType];
        const importance = metadata?.importance || 'medium';
        return sum + importanceWeights[importance];
      }, 0);
      
      const engagementScore = uniqueUsers > 0 ? weightedScore / uniqueUsers : 0;

      return {
        category: category.replace('_', ' ').toUpperCase(),
        eventCount,
        uniqueUsers,
        averageEventsPerUser: Number(averageEventsPerUser.toFixed(2)),
        engagementScore: Number(engagementScore.toFixed(2))
      };
    }).sort((a, b) => b.engagementScore - a.engagementScore);
  },

  /**
   * Calculate event importance distribution
   */
  calculateImportanceDistribution(events: AnalyticsEvent[]): Array<{
    importance: string;
    count: number;
    percentage: number;
    avgPerSession: number;
  }> {
    if (!events || events.length === 0) return [];

    const importanceCounts = new Map<string, number>();
    const sessionIds = new Set(events.map(e => e.sessionId));
    const totalSessions = sessionIds.size;

    events.forEach(event => {
      const metadata = EVENT_METADATA[event.eventType as EventType];
      const importance = metadata?.importance || 'medium';
      importanceCounts.set(importance, (importanceCounts.get(importance) || 0) + 1);
    });

    const totalEvents = events.length;
    
    return Array.from(importanceCounts.entries()).map(([importance, count]) => ({
      importance,
      count,
      percentage: Number(((count / totalEvents) * 100).toFixed(1)),
      avgPerSession: totalSessions > 0 ? Number((count / totalSessions).toFixed(2)) : 0
    })).sort((a, b) => {
      const order = ['critical', 'high', 'medium', 'low'];
      return order.indexOf(a.importance) - order.indexOf(b.importance);
    });
  }
};

// Additional utility functions for 28-event analytics

/**
 * Get user journey completion percentage
 */
export function calculateJourneyCompleteness(events: AnalyticsEvent[], sessionId: string): {
  completionPercentage: number;
  completedStages: string[];
  currentStage: string;
  stagnationRisk: boolean;
} {
  const sessionEvents = events
    .filter(e => e.sessionId === sessionId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const journeyStages = [
    EventType.WIDGET_INITIALIZED,
    EventType.IBE_LAUNCHED,
    EventType.CHECKIN_DATE_SELECTED,
    EventType.CHECKOUT_DATE_SELECTED,
    EventType.SEARCH_SUBMITTED,
    EventType.ROOM_DETAILS_VIEWED,
    EventType.ROOM_TYPE_SELECTED,
    EventType.PAYMENT_METHOD_SELECTED,
    EventType.RESERVATION_CONFIRMED
  ];

  const completedStages = journeyStages.filter(stage =>
    sessionEvents.some(event => event.eventType === stage)
  );

  const completionPercentage = (completedStages.length / journeyStages.length) * 100;
  const currentStageIndex = completedStages.length - 1;
  const currentStage = currentStageIndex >= 0 
    ? EVENT_METADATA[completedStages[currentStageIndex]]?.label || 'Unknown'
    : 'Not Started';

  // Check for stagnation (no progress in last 5 minutes)
  const lastEvent = sessionEvents[sessionEvents.length - 1];
  const stagnationRisk = lastEvent 
    ? (Date.now() - new Date(lastEvent.timestamp).getTime()) > 300000 // 5 minutes
    : false;

  return {
    completionPercentage: Number(completionPercentage.toFixed(1)),
    completedStages: completedStages.map(stage => EVENT_METADATA[stage]?.label || stage),
    currentStage,
    stagnationRisk
  };
}

/**
 * Calculate real-time performance metrics
 */
export function calculateRealTimeMetrics(events: AnalyticsEvent[], timeWindow: number = 300000): {
  eventsPerMinute: number;
  activeSessions: number;
  conversionVelocity: number;
  errorRate: number;
  performanceScore: number;
} {
  const now = Date.now();
  const recentEvents = events.filter(e => 
    (now - new Date(e.timestamp).getTime()) <= timeWindow
  );

  const eventsPerMinute = (recentEvents.length / (timeWindow / 60000));
  const activeSessions = new Set(recentEvents.map(e => e.sessionId)).size;
  
  const conversions = recentEvents.filter(e => e.eventType === EventType.RESERVATION_CONFIRMED).length;
  const conversionVelocity = conversions > 0 ? conversions / (timeWindow / 60000) : 0;
  
  // Mock error rate calculation (would need actual error events)
  const errorEvents = recentEvents.filter(e => e.eventType === EventType.BOOKING_ENGINE_EXITED).length;
  const errorRate = recentEvents.length > 0 ? (errorEvents / recentEvents.length) * 100 : 0;
  
  // Calculate performance score based on various factors
  const baseScore = 100;
  const errorPenalty = errorRate * 2; // 2 points per % error rate
  const activityBonus = Math.min(eventsPerMinute * 0.5, 20); // Up to 20 bonus points for activity
  const conversionBonus = conversionVelocity * 10; // 10 points per conversion per minute
  
  const performanceScore = Math.max(0, Math.min(100, baseScore - errorPenalty + activityBonus + conversionBonus));

  return {
    eventsPerMinute: Number(eventsPerMinute.toFixed(1)),
    activeSessions,
    conversionVelocity: Number(conversionVelocity.toFixed(2)),
    errorRate: Number(errorRate.toFixed(1)),
    performanceScore: Number(performanceScore.toFixed(0))
  };
}