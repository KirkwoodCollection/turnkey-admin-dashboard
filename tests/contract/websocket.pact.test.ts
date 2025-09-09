import { Pact, Interaction, Matchers } from '@pact-foundation/pact';
import { MessagePact, Message } from '@pact-foundation/pact';
import path from 'path';

const { like, eachLike, iso8601DateTime, term, integer } = Matchers;

describe('WebSocket Contract Tests', () => {
  const messagePact = new MessagePact({
    consumer: 'turnkey-admin-dashboard',
    provider: 'turnkey-websocket-gateway',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'info',
  });

  afterAll(async () => {
    await messagePact.verify();
  });

  describe('Connection Messages', () => {
    it('should handle connection established message', async () => {
      await messagePact
        .expectsToReceive('connection established message')
        .withContent({
          type: 'CONNECTION_ESTABLISHED',
          payload: {
            sessionId: like('ws-session-abc123'),
            timestamp: iso8601DateTime('2024-01-15T10:30:00Z'),
          },
          timestamp: iso8601DateTime('2024-01-15T10:30:00Z'),
          id: like('msg_conn_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('CONNECTION_ESTABLISHED');
          expect(message.payload).toMatchObject({
            sessionId: expect.any(String),
            timestamp: expect.any(String),
          });
          expect(message.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/);
          expect(message.id).toBeDefined();
        });
    });

    it('should handle connection error message', async () => {
      await messagePact
        .expectsToReceive('connection error message')
        .withContent({
          type: 'CONNECTION_ERROR',
          payload: {
            error: like('Authentication failed'),
            code: term({
              matcher: 'AUTH_FAILED|INVALID_TOKEN|RATE_LIMITED',
              generate: 'AUTH_FAILED',
            }),
            retryAfter: integer(5000),
          },
          timestamp: iso8601DateTime(),
          id: like('msg_err_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('CONNECTION_ERROR');
          expect(message.payload.error).toEqual('Authentication failed');
          expect(['AUTH_FAILED', 'INVALID_TOKEN', 'RATE_LIMITED']).toContain(message.payload.code);
          expect(typeof message.payload.retryAfter).toBe('number');
        });
    });
  });

  describe('Metrics Update Messages', () => {
    it('should handle metrics update message', async () => {
      await messagePact
        .expectsToReceive('metrics update message')
        .withContent({
          type: 'METRICS_UPDATE',
          payload: {
            activeUsers: integer(47),
            totalSearches: integer(1623),
            totalBookings: integer(241),
            conversionRate: like(14.86),
            abandonmentRate: like(30.8),
            averageSessionDuration: integer(358),
            averageLeadTime: integer(13),
            timestamp: iso8601DateTime('2024-01-15T10:31:00Z'),
            deltaFromPrevious: {
              activeUsers: integer(5),
              totalSearches: integer(56),
              totalBookings: integer(7),
            },
          },
          timestamp: iso8601DateTime('2024-01-15T10:31:00Z'),
          id: like('msg_metrics_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('METRICS_UPDATE');
          expect(message.payload).toMatchObject({
            activeUsers: expect.any(Number),
            totalSearches: expect.any(Number),
            totalBookings: expect.any(Number),
            conversionRate: expect.any(Number),
            abandonmentRate: expect.any(Number),
            averageSessionDuration: expect.any(Number),
            averageLeadTime: expect.any(Number),
            timestamp: expect.any(String),
            deltaFromPrevious: expect.any(Object),
          });
          
          // Validate data ranges
          expect(message.payload.activeUsers).toBeGreaterThanOrEqual(0);
          expect(message.payload.conversionRate).toBeGreaterThanOrEqual(0);
          expect(message.payload.conversionRate).toBeLessThanOrEqual(100);
          expect(message.payload.abandonmentRate).toBeGreaterThanOrEqual(0);
          expect(message.payload.abandonmentRate).toBeLessThanOrEqual(100);
        });
    });

    it('should handle funnel stats update message', async () => {
      await messagePact
        .expectsToReceive('funnel stats update message')
        .withContent({
          type: 'FUNNEL_UPDATE',
          payload: {
            funnelStats: eachLike({
              stage: like('Visitors'),
              count: integer(1050),
              percentage: like(100.0),
              dropOffRate: like(0),
              changeFromPrevious: integer(50),
            }, { min: 3 }),
            timestamp: iso8601DateTime(),
          },
          timestamp: iso8601DateTime(),
          id: like('msg_funnel_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('FUNNEL_UPDATE');
          expect(Array.isArray(message.payload.funnelStats)).toBe(true);
          expect(message.payload.funnelStats.length).toBeGreaterThanOrEqual(3);
          
          message.payload.funnelStats.forEach(stage => {
            expect(stage).toMatchObject({
              stage: expect.any(String),
              count: expect.any(Number),
              percentage: expect.any(Number),
              dropOffRate: expect.any(Number),
              changeFromPrevious: expect.any(Number),
            });
            
            expect(stage.count).toBeGreaterThanOrEqual(0);
            expect(stage.percentage).toBeGreaterThanOrEqual(0);
            expect(stage.percentage).toBeLessThanOrEqual(100);
          });
        });
    });
  });

  describe('Session Update Messages', () => {
    it('should handle new session creation message', async () => {
      await messagePact
        .expectsToReceive('new session creation message')
        .withContent({
          type: 'SESSION_CREATED',
          payload: {
            sessionId: like('sess_new_001'),
            userId: like('user_new_001'),
            hotel: like('Test Hotel'),
            destination: like('Test Destination'),
            status: term({
              matcher: 'LIVE|DORMANT|CONFIRMED_BOOKING|ABANDONED',
              generate: 'LIVE',
            }),
            createdAt: iso8601DateTime(),
            updatedAt: iso8601DateTime(),
            currentStage: integer(1),
            completedStages: eachLike('destination', { min: 1 }),
            metadata: {
              source: like('web'),
              userAgent: like('Mozilla/5.0 (compatible)'),
              ipAddress: like('192.168.1.1'),
            },
          },
          timestamp: iso8601DateTime(),
          id: like('msg_session_new_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('SESSION_CREATED');
          expect(message.payload).toMatchObject({
            sessionId: expect.any(String),
            userId: expect.any(String),
            hotel: expect.any(String),
            destination: expect.any(String),
            status: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            currentStage: expect.any(Number),
            completedStages: expect.any(Array),
            metadata: expect.any(Object),
          });

          expect(['LIVE', 'DORMANT', 'CONFIRMED_BOOKING', 'ABANDONED']).toContain(message.payload.status);
          expect(message.payload.currentStage).toBeGreaterThanOrEqual(0);
          expect(message.payload.completedStages.length).toBeGreaterThanOrEqual(1);
        });
    });

    it('should handle session stage progression message', async () => {
      await messagePact
        .expectsToReceive('session stage progression message')
        .withContent({
          type: 'SESSION_STAGE_UPDATE',
          payload: {
            sessionId: like('sess_existing_001'),
            previousStage: integer(2),
            currentStage: integer(3),
            newCompletedStage: like('room_selection'),
            completedStages: eachLike('destination', { min: 3 }),
            timestamp: iso8601DateTime(),
            metadata: {
              stageDuration: integer(45000), // milliseconds
              userActions: integer(5),
            },
          },
          timestamp: iso8601DateTime(),
          id: like('msg_session_stage_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('SESSION_STAGE_UPDATE');
          expect(message.payload.currentStage).toBeGreaterThan(message.payload.previousStage);
          expect(message.payload.completedStages).toContain(message.payload.newCompletedStage);
          expect(message.payload.metadata.stageDuration).toBeGreaterThan(0);
          expect(message.payload.metadata.userActions).toBeGreaterThanOrEqual(0);
        });
    });

    it('should handle session abandonment message', async () => {
      await messagePact
        .expectsToReceive('session abandonment message')
        .withContent({
          type: 'SESSION_ABANDONED',
          payload: {
            sessionId: like('sess_abandoned_001'),
            userId: like('user_abandoned_001'),
            abandonmentStage: like('payment'),
            abandonmentReason: term({
              matcher: 'TIMEOUT|USER_EXIT|ERROR|PRICE_CHANGE',
              generate: 'TIMEOUT',
            }),
            sessionDuration: integer(1800000), // milliseconds
            completedStages: eachLike('destination', { min: 1 }),
            finalStage: integer(8),
            timestamp: iso8601DateTime(),
            metadata: {
              lastAction: like('clicked_back_button'),
              timeOnStage: integer(120000), // milliseconds spent on abandonment stage
            },
          },
          timestamp: iso8601DateTime(),
          id: like('msg_session_abandon_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('SESSION_ABANDONED');
          expect(['TIMEOUT', 'USER_EXIT', 'ERROR', 'PRICE_CHANGE']).toContain(message.payload.abandonmentReason);
          expect(message.payload.sessionDuration).toBeGreaterThan(0);
          expect(message.payload.finalStage).toBeGreaterThanOrEqual(0);
          expect(message.payload.metadata.timeOnStage).toBeGreaterThanOrEqual(0);
        });
    });

    it('should handle booking confirmation message', async () => {
      await messagePact
        .expectsToReceive('booking confirmation message')
        .withContent({
          type: 'BOOKING_CONFIRMED',
          payload: {
            sessionId: like('sess_confirmed_001'),
            userId: like('user_confirmed_001'),
            bookingId: like('booking_001'),
            hotel: like('Confirmed Hotel'),
            destination: like('Confirmed Destination'),
            checkInDate: like('2024-02-01'),
            checkOutDate: like('2024-02-03'),
            guests: integer(2),
            rooms: integer(1),
            selectedRoomType: like('Deluxe Suite'),
            totalPrice: like(525.00),
            currency: like('USD'),
            sessionDuration: integer(2400000), // milliseconds
            completedStages: eachLike('destination', { min: 9 }), // All stages completed
            timestamp: iso8601DateTime(),
            metadata: {
              paymentMethod: like('credit_card'),
              promocodeUsed: like('SUMMER2024'),
              discount: like(25.00),
            },
          },
          timestamp: iso8601DateTime(),
          id: like('msg_booking_confirm_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('BOOKING_CONFIRMED');
          expect(message.payload).toMatchObject({
            sessionId: expect.any(String),
            userId: expect.any(String),
            bookingId: expect.any(String),
            hotel: expect.any(String),
            destination: expect.any(String),
            checkInDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            checkOutDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
            guests: expect.any(Number),
            rooms: expect.any(Number),
            selectedRoomType: expect.any(String),
            totalPrice: expect.any(Number),
            currency: expect.any(String),
            completedStages: expect.any(Array),
          });

          expect(message.payload.guests).toBeGreaterThan(0);
          expect(message.payload.rooms).toBeGreaterThan(0);
          expect(message.payload.totalPrice).toBeGreaterThan(0);
          expect(message.payload.completedStages.length).toBeGreaterThanOrEqual(9);
        });
    });
  });

  describe('Analytics Event Messages', () => {
    it('should handle page view analytics event', async () => {
      await messagePact
        .expectsToReceive('page view analytics event')
        .withContent({
          type: 'ANALYTICS_EVENT',
          payload: {
            eventId: like('evt_pageview_001'),
            sessionId: like('sess_001'),
            eventType: 'PAGE_VIEW',
            timestamp: iso8601DateTime(),
            data: {
              page: like('/search-results'),
              referrer: like('/homepage'),
              duration: integer(15000), // milliseconds
              scrollDepth: like(75.5), // percentage
              exitPoint: like(false),
            },
            userContext: {
              userId: like('user_001'),
              deviceType: term({
                matcher: 'desktop|mobile|tablet',
                generate: 'desktop',
              }),
              browser: like('Chrome'),
              location: like('Santa Barbara, CA'),
            },
          },
          timestamp: iso8601DateTime(),
          id: like('msg_analytics_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('ANALYTICS_EVENT');
          expect(message.payload.eventType).toBe('PAGE_VIEW');
          expect(message.payload.data.duration).toBeGreaterThanOrEqual(0);
          expect(message.payload.data.scrollDepth).toBeGreaterThanOrEqual(0);
          expect(message.payload.data.scrollDepth).toBeLessThanOrEqual(100);
          expect(['desktop', 'mobile', 'tablet']).toContain(message.payload.userContext.deviceType);
        });
    });

    it('should handle search analytics event', async () => {
      await messagePact
        .expectsToReceive('search analytics event')
        .withContent({
          type: 'ANALYTICS_EVENT',
          payload: {
            eventId: like('evt_search_001'),
            sessionId: like('sess_search_001'),
            eventType: 'DESTINATION_SEARCH',
            timestamp: iso8601DateTime(),
            data: {
              destination: like('Monterey Bay'),
              checkInDate: like('2024-03-15'),
              checkOutDate: like('2024-03-17'),
              guests: integer(2),
              rooms: integer(1),
              filters: {
                priceRange: like('mid'),
                amenities: eachLike('wifi', { min: 1 }),
                starRating: integer(4),
              },
              resultsCount: integer(24),
              searchDuration: integer(850), // milliseconds
            },
            userContext: {
              userId: like('user_search_001'),
              isReturningUser: like(true),
              previousSearches: integer(3),
            },
          },
          timestamp: iso8601DateTime(),
          id: like('msg_search_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('ANALYTICS_EVENT');
          expect(message.payload.eventType).toBe('DESTINATION_SEARCH');
          expect(message.payload.data.guests).toBeGreaterThan(0);
          expect(message.payload.data.rooms).toBeGreaterThan(0);
          expect(message.payload.data.resultsCount).toBeGreaterThanOrEqual(0);
          expect(message.payload.data.searchDuration).toBeGreaterThan(0);
          expect(message.payload.data.filters.starRating).toBeGreaterThanOrEqual(1);
          expect(message.payload.data.filters.starRating).toBeLessThanOrEqual(5);
        });
    });

    it('should handle hotel view analytics event', async () => {
      await messagePact
        .expectsToReceive('hotel view analytics event')
        .withContent({
          type: 'ANALYTICS_EVENT',
          payload: {
            eventId: like('evt_hotelview_001'),
            sessionId: like('sess_hotelview_001'),
            eventType: 'HOTEL_VIEW',
            timestamp: iso8601DateTime(),
            data: {
              hotel: like('Ocean View Resort'),
              hotelId: like('hotel_123'),
              destination: like('Carmel'),
              viewDuration: integer(45000), // milliseconds
              roomsViewed: eachLike('Standard King', { min: 1 }),
              priceRange: like('$200-300'),
              amenitiesViewed: eachLike('pool', { min: 1 }),
              photosViewed: integer(8),
              reviewsViewed: integer(3),
              comparisonMode: like(false),
            },
            userContext: {
              userId: like('user_hotelview_001'),
              previousHotelViews: integer(2),
              favoritesList: eachLike('hotel_456', { min: 0 }),
            },
          },
          timestamp: iso8601DateTime(),
          id: like('msg_hotelview_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('ANALYTICS_EVENT');
          expect(message.payload.eventType).toBe('HOTEL_VIEW');
          expect(message.payload.data.viewDuration).toBeGreaterThan(0);
          expect(message.payload.data.photosViewed).toBeGreaterThanOrEqual(0);
          expect(message.payload.data.reviewsViewed).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(message.payload.data.roomsViewed)).toBe(true);
          expect(Array.isArray(message.payload.data.amenitiesViewed)).toBe(true);
        });
    });
  });

  describe('System Messages', () => {
    it('should handle heartbeat message', async () => {
      await messagePact
        .expectsToReceive('heartbeat message')
        .withContent({
          type: 'HEARTBEAT',
          payload: {
            timestamp: iso8601DateTime(),
            serverTime: iso8601DateTime(),
            connectionId: like('conn_123'),
            activeConnections: integer(245),
          },
          timestamp: iso8601DateTime(),
          id: like('msg_heartbeat_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('HEARTBEAT');
          expect(message.payload.activeConnections).toBeGreaterThanOrEqual(0);
          expect(new Date(message.payload.serverTime)).toBeInstanceOf(Date);
        });
    });

    it('should handle subscription confirmation message', async () => {
      await messagePact
        .expectsToReceive('subscription confirmation message')
        .withContent({
          type: 'SUBSCRIPTION_CONFIRMED',
          payload: {
            subscriptionType: term({
              matcher: 'metrics|sessions|analytics|all',
              generate: 'metrics',
            }),
            subscriptionId: like('sub_metrics_001'),
            filters: {
              timeRange: like('24h'),
              includeHistorical: like(false),
            },
            timestamp: iso8601DateTime(),
          },
          timestamp: iso8601DateTime(),
          id: like('msg_sub_confirm_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('SUBSCRIPTION_CONFIRMED');
          expect(['metrics', 'sessions', 'analytics', 'all']).toContain(message.payload.subscriptionType);
          expect(message.payload.subscriptionId).toBeDefined();
        });
    });

    it('should handle server maintenance notification', async () => {
      await messagePact
        .expectsToReceive('server maintenance notification')
        .withContent({
          type: 'MAINTENANCE_NOTIFICATION',
          payload: {
            maintenanceType: term({
              matcher: 'SCHEDULED|EMERGENCY|UPDATE',
              generate: 'SCHEDULED',
            }),
            scheduledStart: iso8601DateTime('2024-01-20T02:00:00Z'),
            estimatedDuration: integer(3600000), // milliseconds
            affectedServices: eachLike('analytics', { min: 1 }),
            message: like('Scheduled maintenance for system updates'),
            gracePeriod: integer(300000), // 5 minutes
          },
          timestamp: iso8601DateTime(),
          id: like('msg_maintenance_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('MAINTENANCE_NOTIFICATION');
          expect(['SCHEDULED', 'EMERGENCY', 'UPDATE']).toContain(message.payload.maintenanceType);
          expect(message.payload.estimatedDuration).toBeGreaterThan(0);
          expect(message.payload.gracePeriod).toBeGreaterThanOrEqual(0);
          expect(Array.isArray(message.payload.affectedServices)).toBe(true);
        });
    });
  });

  describe('Error Messages', () => {
    it('should handle general error message', async () => {
      await messagePact
        .expectsToReceive('general error message')
        .withContent({
          type: 'ERROR',
          payload: {
            errorCode: term({
              matcher: 'VALIDATION_ERROR|PROCESSING_ERROR|TIMEOUT|RATE_LIMITED',
              generate: 'PROCESSING_ERROR',
            }),
            message: like('Failed to process request'),
            details: like('Database connection timeout'),
            retryable: like(true),
            retryAfter: integer(5000),
            correlationId: like('corr_12345'),
          },
          timestamp: iso8601DateTime(),
          id: like('msg_error_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('ERROR');
          expect(['VALIDATION_ERROR', 'PROCESSING_ERROR', 'TIMEOUT', 'RATE_LIMITED']).toContain(message.payload.errorCode);
          expect(typeof message.payload.retryable).toBe('boolean');
          expect(message.payload.retryAfter).toBeGreaterThanOrEqual(0);
        });
    });

    it('should handle subscription error message', async () => {
      await messagePact
        .expectsToReceive('subscription error message')
        .withContent({
          type: 'SUBSCRIPTION_ERROR',
          payload: {
            subscriptionType: like('metrics'),
            errorReason: term({
              matcher: 'INVALID_FILTER|ACCESS_DENIED|RESOURCE_LIMIT|SERVER_ERROR',
              generate: 'ACCESS_DENIED',
            }),
            message: like('Access denied for metrics subscription'),
            suggestedAction: like('Check authentication credentials'),
          },
          timestamp: iso8601DateTime(),
          id: like('msg_sub_error_001'),
        })
        .verify((message) => {
          expect(message.type).toBe('SUBSCRIPTION_ERROR');
          expect(['INVALID_FILTER', 'ACCESS_DENIED', 'RESOURCE_LIMIT', 'SERVER_ERROR']).toContain(message.payload.errorReason);
          expect(message.payload.suggestedAction).toBeDefined();
        });
    });
  });
});