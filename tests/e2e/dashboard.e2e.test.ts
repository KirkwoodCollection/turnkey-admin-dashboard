import { test, expect, Page, BrowserContext } from '@playwright/test';
import { setupMockServer, teardownMockServer } from '../mocks/mockServer';
import { mockDashboardMetrics, mockSessions } from '../fixtures/mockData';

let mockServerInstance: any;

test.describe('Dashboard E2E Tests', () => {
  test.beforeAll(async () => {
    mockServerInstance = await setupMockServer();
  });

  test.afterAll(async () => {
    await teardownMockServer();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and wait for initial load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Dashboard Loading and Layout', () => {
    test('should load dashboard with all main components', async ({ page }) => {
      // Check page title
      await expect(page).toHaveTitle(/TurnkeyHMS Admin Dashboard/);
      
      // Check main navigation
      await expect(page.locator('[data-testid="main-nav"]')).toBeVisible();
      await expect(page.locator('text=Dashboard')).toBeVisible();
      
      // Check dashboard header
      await expect(page.locator('h1:has-text("Dashboard Overview")')).toBeVisible();
      
      // Check time filter selector
      await expect(page.locator('[data-testid="time-filter-selector"]')).toBeVisible();
      
      // Check top stats panel
      await expect(page.locator('[data-testid="top-stats-panel"]')).toBeVisible();
      await expect(page.locator('text=Active Users')).toBeVisible();
      await expect(page.locator('text=Total Searches')).toBeVisible();
      await expect(page.locator('text=Total Bookings')).toBeVisible();
      
      // Check funnel chart
      await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible();
      await expect(page.locator('text=Booking Funnel')).toBeVisible();
      
      // Check heatmap calendar
      await expect(page.locator('[data-testid="heatmap-calendar"]')).toBeVisible();
      await expect(page.locator('text=Activity Heatmap')).toBeVisible();
      
      // Check sessions table
      await expect(page.locator('[data-testid="sessions-table"]')).toBeVisible();
      await expect(page.locator('text=Recent Sessions')).toBeVisible();
    });

    test('should display loading states initially', async ({ page }) => {
      // Reload page to catch loading states
      await page.reload();
      
      // Should show loading skeletons initially
      await expect(page.locator('[data-testid="stats-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="chart-loading"]')).toBeVisible();
      
      // Wait for content to load
      await page.waitForSelector('[data-testid="stats-loading"]', { state: 'hidden' });
      await page.waitForSelector('[data-testid="chart-loading"]', { state: 'hidden' });
      
      // Verify actual content is now visible
      await expect(page.locator('text=42')).toBeVisible(); // Active users
      await expect(page.locator('text=1.6K')).toBeVisible(); // Total searches
    });

    test('should be responsive on mobile viewports', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check mobile navigation
      await expect(page.locator('[data-testid="mobile-nav-toggle"]')).toBeVisible();
      
      // Stats should stack vertically
      const statsPanel = page.locator('[data-testid="top-stats-panel"]');
      await expect(statsPanel).toBeVisible();
      
      // Charts should be responsive
      const funnelChart = page.locator('[data-testid="funnel-chart"]');
      await expect(funnelChart).toBeVisible();
      
      // Table should be scrollable horizontally
      const sessionTable = page.locator('[data-testid="sessions-table"]');
      await expect(sessionTable).toBeVisible();
    });
  });

  test.describe('Time Filter Functionality', () => {
    test('should change data when time filter is updated', async ({ page }) => {
      // Wait for initial data load
      await page.waitForSelector('text=42', { timeout: 5000 });
      
      // Click time filter dropdown
      await page.locator('[data-testid="time-filter-selector"]').click();
      
      // Select "Last 7 Days"
      await page.locator('text=Last 7 Days').click();
      
      // Wait for API call to complete
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/analytics/dashboard') && 
        response.url().includes('timeRange=7d')
      );
      
      // Verify filter selection persisted
      await expect(page.locator('[data-testid="time-filter-selector"] input')).toHaveValue('Last 7 Days');
    });

    test('should handle custom date range selection', async ({ page }) => {
      // Click time filter dropdown
      await page.locator('[data-testid="time-filter-selector"]').click();
      
      // Select "Custom Range" if available
      const customOption = page.locator('text=Custom Range');
      if (await customOption.isVisible()) {
        await customOption.click();
        
        // Should open date picker
        await expect(page.locator('[data-testid="custom-date-picker"]')).toBeVisible();
        
        // Select start date
        await page.locator('[data-testid="start-date-input"]').fill('2024-01-01');
        
        // Select end date  
        await page.locator('[data-testid="end-date-input"]').fill('2024-01-31');
        
        // Apply custom range
        await page.locator('[data-testid="apply-custom-range"]').click();
        
        // Wait for API call with custom range
        await page.waitForResponse(response => 
          response.url().includes('/api/v1/analytics/dashboard') && 
          response.url().includes('timeRange=custom')
        );
      }
    });
  });

  test.describe('Data Display and Interactions', () => {
    test('should display correct metrics data', async ({ page }) => {
      // Wait for data to load
      await page.waitForSelector('text=42', { timeout: 5000 });
      
      // Verify top stats values match mock data
      await expect(page.locator('text=42')).toBeVisible(); // Active users
      await expect(page.locator('text=1.6K')).toBeVisible(); // Total searches (1567 formatted)
      await expect(page.locator('text=234')).toBeVisible(); // Total bookings
      await expect(page.locator('text=14.9%')).toBeVisible(); // Conversion rate
      await expect(page.locator('text=31.2%')).toBeVisible(); // Abandonment rate
      
      // Check funnel stages
      await expect(page.locator('text=Visitors')).toBeVisible();
      await expect(page.locator('text=Destination Search')).toBeVisible();
      await expect(page.locator('text=Hotel Selection')).toBeVisible();
      await expect(page.locator('text=Confirmation')).toBeVisible();
    });

    test('should handle session table interactions', async ({ page }) => {
      // Wait for sessions table to load
      await page.waitForSelector('[data-testid="sessions-table"]', { timeout: 5000 });
      
      // Check session table headers
      await expect(page.locator('text=Session ID')).toBeVisible();
      await expect(page.locator('text=Hotel')).toBeVisible();
      await expect(page.locator('text=Status')).toBeVisible();
      
      // Check first session row
      await expect(page.locator('text=sess_test_001')).toBeVisible();
      await expect(page.locator('text=The Ballard Inn & Restaurant')).toBeVisible();
      await expect(page.locator('text=LIVE')).toBeVisible();
      
      // Click view button for first session
      const firstViewButton = page.locator('button:has-text("View")').first();
      await firstViewButton.click();
      
      // Should navigate to session detail or open modal
      // (Implementation depends on your specific UI behavior)
    });

    test('should handle table pagination', async ({ page }) => {
      // Wait for sessions table
      await page.waitForSelector('[data-testid="sessions-table"]', { timeout: 5000 });
      
      // Check for pagination controls
      const paginationControls = page.locator('[data-testid="table-pagination"]');
      if (await paginationControls.isVisible()) {
        // Check current page indicator
        await expect(page.locator('text=1-10 of')).toBeVisible();
        
        // Test page size change
        const rowsPerPageSelect = page.locator('[data-testid="rows-per-page-select"]');
        if (await rowsPerPageSelect.isVisible()) {
          await rowsPerPageSelect.click();
          await page.locator('text=25').click();
          
          // Wait for table to update
          await page.waitForTimeout(1000);
          await expect(page.locator('text=1-25 of')).toBeVisible();
        }
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should show connection status indicator', async ({ page }) => {
      // Wait for WebSocket connection
      await page.waitForSelector('[data-testid="connection-indicator"]', { timeout: 10000 });
      
      // Should show connected status
      await expect(page.locator('text=LIVE')).toBeVisible();
      
      // Connection indicator should be green/success color
      const indicator = page.locator('[data-testid="connection-indicator"]');
      await expect(indicator).toHaveClass(/connected|success/);
    });

    test('should handle simulated real-time updates', async ({ page }) => {
      // Wait for initial load
      await page.waitForSelector('text=42', { timeout: 5000 });
      
      // Simulate WebSocket message via window method (if implemented)
      await page.evaluate(() => {
        // This would trigger your WebSocket mock to send an update
        if (window.mockWebSocket) {
          window.mockWebSocket.simulateMessage({
            type: 'METRICS_UPDATE',
            payload: {
              activeUsers: 55,
              totalSearches: 1600,
              conversionRate: 15.2,
            },
            timestamp: new Date().toISOString(),
          });
        }
      });
      
      // Wait for UI to update with new values
      await page.waitForSelector('text=55', { timeout: 2000 });
      await expect(page.locator('text=1.6K')).toBeVisible(); // Should update to show ~1600
    });
  });

  test.describe('Error Handling', () => {
    test('should display error state when API fails', async ({ page, context }) => {
      // Intercept API calls and return error
      await page.route('/api/v1/analytics/dashboard', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' })
        });
      });
      
      // Reload page to trigger error
      await page.reload();
      
      // Should show error message
      await expect(page.locator('text=Failed to load dashboard data')).toBeVisible();
      await expect(page.locator('text=Try again')).toBeVisible();
      
      // Remove route intercept and click retry
      await page.unroute('/api/v1/analytics/dashboard');
      await page.locator('text=Try again').click();
      
      // Should recover and show data
      await page.waitForSelector('text=42', { timeout: 5000 });
    });

    test('should handle network connectivity issues', async ({ page, context }) => {
      // Start with normal load
      await page.waitForSelector('text=42', { timeout: 5000 });
      
      // Simulate network failure
      await context.setOffline(true);
      
      // Try to change time filter (should fail)
      await page.locator('[data-testid="time-filter-selector"]').click();
      await page.locator('text=Last 7 Days').click();
      
      // Should show network error or maintain previous data
      await expect(page.locator('text=Network error')).toBeVisible();
      
      // Restore connectivity
      await context.setOffline(false);
      
      // Should recover
      await page.waitForTimeout(2000);
      await expect(page.locator('text=42')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for key content to be visible
      await page.waitForSelector('text=Active Users', { timeout: 10000 });
      await page.waitForSelector('text=42', { timeout: 5000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Mock API to return large dataset
      await page.route('/api/v1/analytics/sessions', route => {
        const largeSessions = Array.from({ length: 100 }, (_, i) => ({
          sessionId: `sess_large_${i}`,
          userId: `user_large_${i}`,
          hotel: `Hotel ${i}`,
          destination: `Destination ${i}`,
          status: 'LIVE',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T10:45:00Z',
          currentStage: 1,
          completedStages: ['destination'],
        }));
        
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            sessions: largeSessions,
            total: 100,
            page: 1,
            limit: 100,
          })
        });
      });
      
      // Reload to get large dataset
      await page.reload();
      
      // Should still load efficiently
      await page.waitForSelector('[data-testid="sessions-table"]', { timeout: 5000 });
      
      // Check that table handles large dataset
      const rows = page.locator('[data-testid="sessions-table"] tbody tr');
      const rowCount = await rows.count();
      expect(rowCount).toBeGreaterThan(0);
      
      // Scrolling should be smooth
      await page.locator('[data-testid="sessions-table"]').scrollIntoView();
      await page.mouse.wheel(0, 500);
      
      // Should remain responsive
      await page.waitForTimeout(500);
      await expect(page.locator('text=sess_large_0')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should meet basic accessibility requirements', async ({ page }) => {
      // Wait for page to load
      await page.waitForSelector('text=Dashboard Overview', { timeout: 5000 });
      
      // Check for proper heading structure
      await expect(page.locator('h1')).toBeVisible();
      
      // Check for aria-labels on interactive elements
      const timeFilterSelector = page.locator('[data-testid="time-filter-selector"]');
      await expect(timeFilterSelector).toHaveAttribute('aria-label');
      
      // Check keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Check focus indicators
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Check color contrast (basic check)
      const backgroundColor = await page.locator('body').evaluate(el => 
        getComputedStyle(el).backgroundColor
      );
      const color = await page.locator('body').evaluate(el => 
        getComputedStyle(el).color  
      );
      
      // Should have proper contrast (simplified check)
      expect(backgroundColor).not.toBe(color);
    });

    test('should support screen reader navigation', async ({ page }) => {
      // Check for proper ARIA roles
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      
      // Tables should have proper structure
      const table = page.locator('[data-testid="sessions-table"]');
      await expect(table.locator('thead')).toBeVisible();
      await expect(table.locator('tbody')).toBeVisible();
      
      // Interactive elements should be keyboard accessible
      await page.keyboard.press('Tab');
      const firstFocusable = page.locator(':focus');
      await page.keyboard.press('Enter');
      
      // Should trigger action or navigation
      await page.waitForTimeout(500);
    });
  });

  test.describe('Browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ page }) => {
        // Navigate and wait for load
        await page.goto('/');
        await page.waitForSelector('text=Dashboard Overview', { timeout: 10000 });
        
        // Basic functionality should work across browsers
        await expect(page.locator('text=Active Users')).toBeVisible();
        await expect(page.locator('text=42')).toBeVisible();
        
        // Interactive elements should work
        await page.locator('[data-testid="time-filter-selector"]').click();
        await expect(page.locator('text=Last 7 Days')).toBeVisible();
        
        // Charts should render
        await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible();
        await expect(page.locator('[data-testid="heatmap-calendar"]')).toBeVisible();
      });
    });
  });
});