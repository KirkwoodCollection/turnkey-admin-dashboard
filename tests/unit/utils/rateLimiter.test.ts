import { RateLimiter, createRateLimiter } from '../../../src/utils/rateLimiter';

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor and configuration', () => {
    it('creates rate limiter with default configuration', () => {
      const limiter = new RateLimiter();
      
      expect(limiter.getConfiguration().maxRequests).toBe(100);
      expect(limiter.getConfiguration().windowMs).toBe(60000); // 1 minute
    });

    it('creates rate limiter with custom configuration', () => {
      const limiter = new RateLimiter({ maxRequests: 10, windowMs: 5000 });
      
      expect(limiter.getConfiguration().maxRequests).toBe(10);
      expect(limiter.getConfiguration().windowMs).toBe(5000);
    });
  });

  describe('request tracking', () => {
    it('allows requests within limit', () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
      
      for (let i = 0; i < 5; i++) {
        expect(limiter.isAllowed('user1')).toBe(true);
      }
    });

    it('blocks requests exceeding limit', () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 });
      
      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        expect(limiter.isAllowed('user1')).toBe(true);
      }
      
      // 4th request should be blocked
      expect(limiter.isAllowed('user1')).toBe(false);
    });

    it('tracks requests per user separately', () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
      
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user2')).toBe(true);
      expect(limiter.isAllowed('user2')).toBe(true);
      
      // Both users should be at their limit
      expect(limiter.isAllowed('user1')).toBe(false);
      expect(limiter.isAllowed('user2')).toBe(false);
    });

    it('resets after window expires', () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
      
      // Use up the limit
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(true);
      expect(limiter.isAllowed('user1')).toBe(false);
      
      // Fast-forward past the window
      jest.advanceTimersByTime(61000);
      
      // Should be allowed again
      expect(limiter.isAllowed('user1')).toBe(true);
    });
  });

  describe('remaining requests', () => {
    it('returns correct remaining requests', () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
      
      expect(limiter.getRemainingRequests('user1')).toBe(5);
      
      limiter.isAllowed('user1');
      expect(limiter.getRemainingRequests('user1')).toBe(4);
      
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      expect(limiter.getRemainingRequests('user1')).toBe(2);
    });

    it('returns 0 when limit exceeded', () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
      
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user1'); // This should fail
      
      expect(limiter.getRemainingRequests('user1')).toBe(0);
    });
  });

  describe('time until reset', () => {
    it('returns correct time until reset', () => {
      const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60000 });
      
      limiter.isAllowed('user1');
      
      const timeUntilReset = limiter.getTimeUntilReset('user1');
      expect(timeUntilReset).toBeGreaterThan(50000);
      expect(timeUntilReset).toBeLessThanOrEqual(60000);
      
      // Fast-forward 30 seconds
      jest.advanceTimersByTime(30000);
      
      const updatedTime = limiter.getTimeUntilReset('user1');
      expect(updatedTime).toBeGreaterThan(20000);
      expect(updatedTime).toBeLessThanOrEqual(30000);
    });

    it('returns 0 for users not tracked', () => {
      const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
      
      expect(limiter.getTimeUntilReset('unknown-user')).toBe(0);
    });
  });

  describe('cleanup', () => {
    it('removes expired entries', () => {
      const limiter = new RateLimiter({ maxRequests: 1, windowMs: 5000 });
      
      limiter.isAllowed('user1');
      expect(limiter.getRemainingRequests('user1')).toBe(0);
      
      // Fast-forward past expiration
      jest.advanceTimersByTime(6000);
      
      // Trigger cleanup by checking another user
      limiter.isAllowed('user2');
      
      // Original user should be reset
      expect(limiter.getRemainingRequests('user1')).toBe(1);
    });

    it('manually cleans up expired entries', () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 10000 });
      
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      
      expect(limiter.getRemainingRequests('user1')).toBe(0);
      
      // Fast-forward past expiration
      jest.advanceTimersByTime(11000);
      
      // Manual cleanup
      limiter.cleanup();
      
      expect(limiter.getRemainingRequests('user1')).toBe(2);
    });
  });

  describe('reset functionality', () => {
    it('resets specific user', () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
      
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user2');
      
      expect(limiter.getRemainingRequests('user1')).toBe(0);
      expect(limiter.getRemainingRequests('user2')).toBe(1);
      
      limiter.reset('user1');
      
      expect(limiter.getRemainingRequests('user1')).toBe(2);
      expect(limiter.getRemainingRequests('user2')).toBe(1); // Should be unchanged
    });

    it('resets all users', () => {
      const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60000 });
      
      limiter.isAllowed('user1');
      limiter.isAllowed('user2');
      
      expect(limiter.getRemainingRequests('user1')).toBe(0);
      expect(limiter.getRemainingRequests('user2')).toBe(0);
      
      limiter.resetAll();
      
      expect(limiter.getRemainingRequests('user1')).toBe(1);
      expect(limiter.getRemainingRequests('user2')).toBe(1);
    });
  });

  describe('statistics', () => {
    it('provides usage statistics', () => {
      const limiter = new RateLimiter({ maxRequests: 3, windowMs: 60000 });
      
      limiter.isAllowed('user1');
      limiter.isAllowed('user1');
      limiter.isAllowed('user2');
      limiter.isAllowed('user3');
      
      const stats = limiter.getStatistics();
      
      expect(stats.totalUsers).toBe(3);
      expect(stats.totalRequests).toBe(4);
      expect(stats.blockedRequests).toBe(0);
      
      // Try to exceed limit
      limiter.isAllowed('user1'); // This should be blocked
      
      const updatedStats = limiter.getStatistics();
      expect(updatedStats.blockedRequests).toBe(1);
    });

    it('calculates hit rate correctly', () => {
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 60000 });
      
      limiter.isAllowed('user1'); // Allowed
      limiter.isAllowed('user1'); // Allowed
      limiter.isAllowed('user1'); // Blocked
      
      const stats = limiter.getStatistics();
      expect(stats.hitRate).toBe(2/3); // 2 allowed out of 3 total
    });
  });
});

describe('createRateLimiter helper', () => {
  it('creates rate limiter with preset configurations', () => {
    const strictLimiter = createRateLimiter('strict');
    expect(strictLimiter.getConfiguration().maxRequests).toBe(10);
    expect(strictLimiter.getConfiguration().windowMs).toBe(60000);
    
    const moderateLimiter = createRateLimiter('moderate');
    expect(moderateLimiter.getConfiguration().maxRequests).toBe(100);
    expect(moderateLimiter.getConfiguration().windowMs).toBe(60000);
    
    const lenientLimiter = createRateLimiter('lenient');
    expect(lenientLimiter.getConfiguration().maxRequests).toBe(1000);
    expect(lenientLimiter.getConfiguration().windowMs).toBe(60000);
  });

  it('creates rate limiter with custom configuration', () => {
    const customLimiter = createRateLimiter({ maxRequests: 50, windowMs: 30000 });
    expect(customLimiter.getConfiguration().maxRequests).toBe(50);
    expect(customLimiter.getConfiguration().windowMs).toBe(30000);
  });
});

describe('edge cases and error handling', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('handles zero max requests', () => {
    const limiter = new RateLimiter({ maxRequests: 0, windowMs: 60000 });
    
    expect(limiter.isAllowed('user1')).toBe(false);
    expect(limiter.getRemainingRequests('user1')).toBe(0);
  });

  it('handles very short time windows', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 1 });
    
    limiter.isAllowed('user1');
    
    // Fast-forward past the tiny window
    jest.advanceTimersByTime(2);
    
    // Should be reset now
    expect(limiter.isAllowed('user1')).toBe(true);
  });

  it('handles invalid user identifiers gracefully', () => {
    const limiter = new RateLimiter({ maxRequests: 5, windowMs: 60000 });
    
    expect(limiter.isAllowed('')).toBe(true);
    expect(limiter.isAllowed(' ')).toBe(true);
    expect(limiter.getRemainingRequests('nonexistent')).toBe(5);
  });

  it('handles concurrent access patterns', () => {
    const limiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 });
    
    // Simulate concurrent requests
    const promises = Array.from({ length: 150 }, (_, i) => 
      Promise.resolve(limiter.isAllowed(`user-${i % 10}`))
    );
    
    return Promise.all(promises).then(results => {
      const allowedCount = results.filter(Boolean).length;
      const blockedCount = results.length - allowedCount;
      
      expect(allowedCount).toBeLessThanOrEqual(1000); // 10 users * 100 max requests
      expect(blockedCount).toBeGreaterThan(0);
    });
  });

  it('maintains performance with many users', () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });
    
    const startTime = Date.now();
    
    // Create requests for 1000 different users
    for (let i = 0; i < 1000; i++) {
      limiter.isAllowed(`user-${i}`);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete reasonably quickly (adjust threshold as needed)
    expect(duration).toBeLessThan(100);
  });
});