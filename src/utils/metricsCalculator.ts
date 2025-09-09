import { Session, AnalyticsEvent } from '../types';

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
  }
};