import { test, expect, Page, BrowserContext } from '@playwright/test';
import { setupMockServer, teardownMockServer } from '../mocks/mockServer';

let mockServerInstance: any;

test.describe('Performance E2E Tests', () => {
  test.beforeAll(async () => {
    mockServerInstance = await setupMockServer();
  });

  test.afterAll(async () => {
    await teardownMockServer();
  });

  test.beforeEach(async ({ page }) => {
    // Set up authenticated state for performance tests
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'perf-test-token');
      localStorage.setItem('user', JSON.stringify({
        uid: 'perf-user-123',
        email: 'perf@turnkeyhms.com',
        displayName: 'Performance User',
        role: 'admin',
      }));
    });
  });

  test.describe('Page Load Performance', () => {
    test('should load dashboard within performance budgets', async ({ page }) => {
      // Start performance measurement
      const startTime = Date.now();
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      // Measure Time to Interactive (TTI)
      await page.waitForSelector('text=Dashboard Overview', { timeout: 10000 });
      await page.waitForSelector('text=42', { timeout: 5000 }); // Active users loaded
      await page.waitForSelector('[data-testid="funnel-chart"]', { timeout: 5000 });
      
      const loadTime = Date.now() - startTime;
      
      // Performance budgets
      expect(loadTime).toBeLessThan(5000); // Total load time < 5s
      
      // Check Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals: any = {};
            
            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
              if (entry.name === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              }
              if (entry.entryType === 'layout-shift') {
                vitals.cls = (vitals.cls || 0) + entry.value;
              }
            });
            
            // Also get navigation timing
            const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
            if (navigation) {
              vitals.domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart;
              vitals.loadComplete = navigation.loadEventEnd - navigation.loadEventStart;
            }
            
            resolve(vitals);
          });
          
          observer.observe({ type: 'paint', buffered: true });
          observer.observe({ type: 'largest-contentful-paint', buffered: true });
          observer.observe({ type: 'layout-shift', buffered: true });
          
          // Fallback timeout
          setTimeout(() => resolve({}), 3000);
        });
      });
      
      console.log('Core Web Vitals:', vitals);
      
      // Core Web Vitals thresholds
      if (vitals.fcp) {
        expect(vitals.fcp).toBeLessThan(2000); // FCP < 2s
      }
      if (vitals.lcp) {
        expect(vitals.lcp).toBeLessThan(4000); // LCP < 4s
      }
      if (vitals.cls) {
        expect(vitals.cls).toBeLessThan(0.1); // CLS < 0.1
      }
    });

    test('should meet progressive loading requirements', async ({ page }) => {
      await page.goto('/');
      
      // First meaningful paint should happen quickly
      const firstMeaningfulPaint = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            for (const entry of entries) {
              if (entry.name === 'first-contentful-paint') {
                resolve(entry.startTime);
                observer.disconnect();
                break;
              }
            }
          });
          observer.observe({ type: 'paint', buffered: true });
          
          setTimeout(() => resolve(0), 2000);
        });
      });
      
      expect(firstMeaningfulPaint).toBeLessThan(1500);
      
      // Critical content should load first
      await expect(page.locator('text=Dashboard Overview')).toBeVisible({ timeout: 2000 });
      await expect(page.locator('[data-testid="top-stats-panel"]')).toBeVisible({ timeout: 3000 });
      
      // Secondary content can load later
      await expect(page.locator('[data-testid="funnel-chart"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="sessions-table"]')).toBeVisible({ timeout: 5000 });
    });

    test('should handle slow network conditions gracefully', async ({ page, context }) => {
      // Simulate slow 3G connection
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        route.continue();
      });
      
      const startTime = Date.now();
      await page.goto('/');
      
      // Should show loading states
      await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
      
      // Should eventually load content
      await expect(page.locator('text=Dashboard Overview')).toBeVisible({ timeout: 15000 });
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(15000); // Should load within 15s even on slow connection
      
      // Remove route to clean up
      await page.unroute('**/*');
    });
  });

  test.describe('Runtime Performance', () => {
    test('should maintain smooth scrolling performance', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Measure scroll performance
      const scrollMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = {
            frameDrops: 0,
            averageFrameTime: 0,
            scrollStart: 0,
            scrollEnd: 0,
          };
          
          let frameCount = 0;
          let totalFrameTime = 0;
          let lastFrameTime = performance.now();
          
          const measureFrame = () => {
            const now = performance.now();
            const frameTime = now - lastFrameTime;
            
            if (frameTime > 16.67) { // > 60fps
              metrics.frameDrops++;
            }
            
            totalFrameTime += frameTime;
            frameCount++;
            lastFrameTime = now;
            
            if (frameCount < 100) { // Measure 100 frames
              requestAnimationFrame(measureFrame);
            } else {
              metrics.averageFrameTime = totalFrameTime / frameCount;
              resolve(metrics);
            }
          };
          
          metrics.scrollStart = performance.now();
          
          // Start scrolling
          window.scrollBy({ top: 1000, behavior: 'smooth' });
          
          requestAnimationFrame(measureFrame);
          
          // Fallback timeout
          setTimeout(() => resolve(metrics), 5000);
        });
      });
      
      console.log('Scroll metrics:', scrollMetrics);
      
      expect(scrollMetrics.frameDrops).toBeLessThan(10); // Less than 10% frame drops
      expect(scrollMetrics.averageFrameTime).toBeLessThan(20); // Average frame time < 20ms
    });

    test('should handle rapid user interactions efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('[data-testid="time-filter-selector"]', { timeout: 5000 });
      
      const startTime = Date.now();
      
      // Rapid time filter changes
      for (let i = 0; i < 5; i++) {
        await page.click('[data-testid="time-filter-selector"]');
        await page.click('text=Last 24 Hours');
        await page.waitForTimeout(100);
        
        await page.click('[data-testid="time-filter-selector"]');
        await page.click('text=Last 7 Days');
        await page.waitForTimeout(100);
      }
      
      const interactionTime = Date.now() - startTime;
      
      // Should handle rapid interactions without blocking UI
      expect(interactionTime).toBeLessThan(3000);
      
      // UI should remain responsive
      await expect(page.locator('text=Dashboard Overview')).toBeVisible();
      
      // Check for memory leaks (basic check)
      const memoryUsage = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      if (memoryUsage > 0) {
        expect(memoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
      }
    });

    test('should efficiently handle real-time data updates', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Simulate rapid WebSocket updates
      const updateMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = {
            updateCount: 0,
            totalUpdateTime: 0,
            averageUpdateTime: 0,
          };
          
          const startTime = performance.now();
          
          // Mock rapid updates
          const interval = setInterval(() => {
            const updateStart = performance.now();
            
            // Simulate WebSocket message
            if (window.mockWebSocket) {
              window.mockWebSocket.simulateMessage({
                type: 'METRICS_UPDATE',
                payload: {
                  activeUsers: Math.floor(Math.random() * 100) + 50,
                  totalSearches: Math.floor(Math.random() * 1000) + 1000,
                },
                timestamp: new Date().toISOString(),
              });
            }
            
            const updateEnd = performance.now();
            metrics.totalUpdateTime += (updateEnd - updateStart);
            metrics.updateCount++;
            
            if (metrics.updateCount >= 50) {
              clearInterval(interval);
              metrics.averageUpdateTime = metrics.totalUpdateTime / metrics.updateCount;
              resolve(metrics);
            }
          }, 50); // Update every 50ms
          
          // Fallback timeout
          setTimeout(() => {
            clearInterval(interval);
            metrics.averageUpdateTime = metrics.totalUpdateTime / Math.max(metrics.updateCount, 1);
            resolve(metrics);
          }, 5000);
        });
      });
      
      console.log('Update metrics:', updateMetrics);
      
      expect(updateMetrics.averageUpdateTime).toBeLessThan(10); // Average update time < 10ms
      expect(updateMetrics.updateCount).toBeGreaterThan(30); // Should handle at least 30 updates
    });
  });

  test.describe('Resource Performance', () => {
    test('should optimize bundle size', async ({ page }) => {
      // Capture network requests during page load
      const requests: any[] = [];
      
      page.on('request', (request) => {
        requests.push({
          url: request.url(),
          resourceType: request.resourceType(),
          size: 0, // Will be updated on response
        });
      });
      
      page.on('response', (response) => {
        const request = requests.find(req => req.url === response.url());
        if (request) {
          const contentLength = response.headers()['content-length'];
          request.size = contentLength ? parseInt(contentLength) : 0;
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Analyze JavaScript bundle sizes
      const jsRequests = requests.filter(req => 
        req.resourceType === 'script' && req.url.includes('.js')
      );
      
      const totalJSSize = jsRequests.reduce((total, req) => total + (req.size || 0), 0);
      
      console.log('JavaScript bundle size:', totalJSSize / 1024, 'KB');
      console.log('JS requests:', jsRequests.length);
      
      // Performance budgets
      expect(totalJSSize).toBeLessThan(500 * 1024); // Total JS < 500KB
      expect(jsRequests.length).toBeLessThan(10); // Fewer than 10 JS files
      
      // Check CSS bundle
      const cssRequests = requests.filter(req => 
        req.resourceType === 'stylesheet' && req.url.includes('.css')
      );
      
      const totalCSSSize = cssRequests.reduce((total, req) => total + (req.size || 0), 0);
      
      console.log('CSS bundle size:', totalCSSSize / 1024, 'KB');
      
      expect(totalCSSSize).toBeLessThan(100 * 1024); // Total CSS < 100KB
    });

    test('should implement efficient caching', async ({ page }) => {
      // First page load
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Capture requests from second page load
      const secondLoadRequests: string[] = [];
      
      page.on('request', (request) => {
        if (request.resourceType() === 'script' || 
            request.resourceType() === 'stylesheet' ||
            request.resourceType() === 'image') {
          secondLoadRequests.push(request.url());
        }
      });
      
      // Reload page
      await page.reload({ waitUntil: 'networkidle' });
      
      // Most static resources should be cached
      const cachedResources = secondLoadRequests.filter(url => 
        url.includes('.js') || 
        url.includes('.css') || 
        url.includes('.png') || 
        url.includes('.jpg')
      );
      
      console.log('Cached resources on reload:', cachedResources.length);
      
      // Should have fewer requests due to caching
      expect(cachedResources.length).toBeLessThan(5);
    });

    test('should optimize image loading', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check for lazy loading implementation
      const images = await page.locator('img').count();
      
      if (images > 0) {
        // Check if images have loading="lazy" attribute
        const lazyImages = await page.locator('img[loading="lazy"]').count();
        
        console.log(`${lazyImages}/${images} images use lazy loading`);
        
        // At least some images should use lazy loading
        expect(lazyImages / images).toBeGreaterThan(0.5);
        
        // Check for proper image formats
        const imgSources = await page.$$eval('img', imgs => 
          imgs.map(img => img.src)
        );
        
        const modernFormats = imgSources.filter(src => 
          src.includes('.webp') || src.includes('.avif')
        );
        
        // Should use modern image formats when available
        if (imgSources.length > 0) {
          expect(modernFormats.length / imgSources.length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Memory Performance', () => {
    test('should prevent memory leaks during navigation', async ({ page }) => {
      // Only run if memory API is available
      const hasMemoryAPI = await page.evaluate(() => 
        'memory' in performance
      );
      
      if (!hasMemoryAPI) {
        test.skip('Memory API not available in this browser');
        return;
      }
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const initialMemory = await page.evaluate(() => 
        (performance as any).memory.usedJSHeapSize
      );
      
      console.log('Initial memory usage:', initialMemory / 1024 / 1024, 'MB');
      
      // Navigate between pages multiple times
      for (let i = 0; i < 5; i++) {
        // Navigate to different sections
        await page.click('[data-testid="time-filter-selector"]');
        await page.click('text=Last 7 Days');
        await page.waitForTimeout(500);
        
        await page.click('[data-testid="time-filter-selector"]');
        await page.click('text=Last 30 Days');
        await page.waitForTimeout(500);
        
        // Force garbage collection if available
        if (await page.evaluate(() => 'gc' in window)) {
          await page.evaluate(() => (window as any).gc());
        }
      }
      
      // Wait for potential cleanup
      await page.waitForTimeout(1000);
      
      const finalMemory = await page.evaluate(() => 
        (performance as any).memory.usedJSHeapSize
      );
      
      console.log('Final memory usage:', finalMemory / 1024 / 1024, 'MB');
      
      const memoryGrowth = finalMemory - initialMemory;
      const growthPercentage = (memoryGrowth / initialMemory) * 100;
      
      console.log('Memory growth:', growthPercentage.toFixed(2), '%');
      
      // Memory growth should be minimal
      expect(growthPercentage).toBeLessThan(50); // Less than 50% growth
      expect(finalMemory).toBeLessThan(100 * 1024 * 1024); // Less than 100MB total
    });

    test('should handle WebSocket connections efficiently', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Monitor WebSocket connection performance
      const wsMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const metrics = {
            connectionTime: 0,
            messageCount: 0,
            totalMessageTime: 0,
            memoryBefore: (performance as any).memory?.usedJSHeapSize || 0,
            memoryAfter: 0,
          };
          
          const connectionStart = performance.now();
          
          // Monitor WebSocket messages
          let messageStartTime = 0;
          
          const originalWebSocket = window.WebSocket;
          window.WebSocket = class extends originalWebSocket {
            constructor(url: string) {
              super(url);
              
              this.onopen = () => {
                metrics.connectionTime = performance.now() - connectionStart;
              };
              
              this.onmessage = (event) => {
                const messageEnd = performance.now();
                if (messageStartTime > 0) {
                  metrics.totalMessageTime += (messageEnd - messageStartTime);
                }
                metrics.messageCount++;
                messageStartTime = performance.now();
              };
            }
          };
          
          // Wait for metrics collection
          setTimeout(() => {
            metrics.memoryAfter = (performance as any).memory?.usedJSHeapSize || 0;
            resolve(metrics);
          }, 5000);
        });
      });
      
      console.log('WebSocket metrics:', wsMetrics);
      
      expect(wsMetrics.connectionTime).toBeLessThan(2000); // Connection < 2s
      
      if (wsMetrics.messageCount > 0) {
        const avgMessageTime = wsMetrics.totalMessageTime / wsMetrics.messageCount;
        expect(avgMessageTime).toBeLessThan(50); // Average message processing < 50ms
      }
    });
  });

  test.describe('Performance Monitoring', () => {
    test('should collect performance metrics', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Collect comprehensive performance metrics
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const resources = performance.getEntriesByType('resource');
        
        return {
          navigation: {
            dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
            tcpConnection: navigation.connectEnd - navigation.connectStart,
            tlsHandshake: navigation.secureConnectionStart > 0 ? 
              navigation.connectEnd - navigation.secureConnectionStart : 0,
            firstByte: navigation.responseStart - navigation.requestStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
            loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          },
          resources: {
            totalRequests: resources.length,
            totalSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
            cacheMisses: resources.filter(r => r.transferSize > 0).length,
          },
          timing: {
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
          },
        };
      });
      
      console.log('Performance metrics:', JSON.stringify(performanceMetrics, null, 2));
      
      // Validate metrics
      expect(performanceMetrics.navigation.domContentLoaded).toBeLessThan(3000);
      expect(performanceMetrics.navigation.loadComplete).toBeLessThan(5000);
      expect(performanceMetrics.resources.totalSize).toBeLessThan(2 * 1024 * 1024); // < 2MB
      
      if (performanceMetrics.timing.firstContentfulPaint > 0) {
        expect(performanceMetrics.timing.firstContentfulPaint).toBeLessThan(2000);
      }
    });

    test('should measure custom performance marks', async ({ page }) => {
      await page.goto('/');
      
      // Wait for custom performance marks that the app might set
      await page.waitForFunction(() => {
        const marks = performance.getEntriesByType('mark');
        return marks.some(mark => mark.name.startsWith('app-'));
      }, { timeout: 10000 }).catch(() => {
        // Custom marks are optional
      });
      
      const customMarks = await page.evaluate(() => {
        const marks = performance.getEntriesByType('mark');
        const measures = performance.getEntriesByType('measure');
        
        return {
          marks: marks
            .filter(mark => mark.name.startsWith('app-'))
            .map(mark => ({ name: mark.name, time: mark.startTime })),
          measures: measures
            .filter(measure => measure.name.startsWith('app-'))
            .map(measure => ({ 
              name: measure.name, 
              duration: measure.duration,
              startTime: measure.startTime 
            })),
        };
      });
      
      console.log('Custom performance marks:', customMarks);
      
      // If the app sets custom marks, validate them
      if (customMarks.measures.length > 0) {
        const criticalMeasures = customMarks.measures.filter(m => 
          m.name.includes('critical') || m.name.includes('important')
        );
        
        criticalMeasures.forEach(measure => {
          expect(measure.duration).toBeLessThan(1000); // Critical operations < 1s
        });
      }
    });
  });
});