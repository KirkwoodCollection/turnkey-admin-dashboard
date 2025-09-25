import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Performance monitoring initialization
export const initializePerformanceMonitoring = () => {
  // Initialize Firebase Performance if available
  if (import.meta.env.VITE_FIREBASE_PROJECT_ID) {
    initializeFirebasePerformance();
  }

  // Initialize Web Vitals tracking
  initializeWebVitals();

  // Initialize custom performance traces
  initializeCustomTraces();
};

// Firebase Performance initialization
const initializeFirebasePerformance = async () => {
  try {
    const { initializeApp } = await import('firebase/app');
    const { getPerformance } = await import('firebase/performance');
    const { getAnalytics } = await import('firebase/analytics');

    const app = initializeApp({
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID,
    });

    // Initialize Performance Monitoring
    getPerformance(app);

    // Initialize Analytics
    getAnalytics(app);

    console.log('Firebase Performance monitoring initialized');
  } catch (error) {
    console.warn('Firebase Performance monitoring failed to initialize:', error);
  }
};

// Web Vitals tracking
const initializeWebVitals = () => {
  const sendToAnalytics = (metric: any) => {
    // Send to Google Analytics if available
    if (window.gtag) {
      window.gtag('event', metric.name, {
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
      });
    }

    // Send to Cloud Monitoring
    sendToCloudMonitoring(metric);

    // Log for debugging
    console.log('Web Vital:', metric.name, metric.value);
  };

  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getFCP(sendToAnalytics);
  getLCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
};

// Send metrics to Cloud Monitoring
const sendToCloudMonitoring = async (metric: any) => {
  try {
    await fetch('/api/v1/metrics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metric_name: metric.name,
        value: metric.value,
        timestamp: Date.now(),
        labels: {
          page: window.location.pathname,
          user_agent: navigator.userAgent,
        },
      }),
    });
  } catch (error) {
    console.warn('Failed to send metric to Cloud Monitoring:', error);
  }
};

// Custom performance traces
const initializeCustomTraces = () => {
  // Track initial load performance
  window.addEventListener('load', () => {
    const loadTime = performance.now();
    const trace = {
      name: 'admin_dashboard_load',
      value: loadTime,
      timestamp: Date.now(),
    };
    
    sendToCloudMonitoring(trace);
  });

  // Track navigation performance
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  const trackNavigation = (url: string) => {
    const navigationStart = performance.now();
    
    // Track navigation completion after a short delay
    setTimeout(() => {
      const navigationEnd = performance.now();
      const navigationTime = navigationEnd - navigationStart;
      
      const trace = {
        name: 'admin_dashboard_navigation',
        value: navigationTime,
        timestamp: Date.now(),
        labels: {
          from_url: window.location.pathname,
          to_url: url,
        },
      };
      
      sendToCloudMonitoring(trace);
    }, 100);
  };

  history.pushState = function(state, title, url) {
    trackNavigation(url as string);
    return originalPushState.call(this, state, title, url);
  };

  history.replaceState = function(state, title, url) {
    trackNavigation(url as string);
    return originalReplaceState.call(this, state, title, url);
  };
};

// Custom performance trace utility for components
export const traceCustom = (name: string) => {
  const startTime = performance.now();
  
  return {
    stop: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const trace = {
        name: `admin_dashboard_${name}`,
        value: duration,
        timestamp: Date.now(),
      };
      
      sendToCloudMonitoring(trace);
    },
  };
};

// Error tracking
export const trackError = (error: Error, context?: string) => {
  const errorMetric = {
    name: 'admin_dashboard_error',
    value: 1,
    timestamp: Date.now(),
    labels: {
      error_message: error.message,
      error_stack: error.stack,
      context: context || 'unknown',
      page: window.location.pathname,
    },
  };
  
  sendToCloudMonitoring(errorMetric);
  
  // Also send to console in development
  if (import.meta.env.DEV) {
    console.error('Tracked error:', error, context);
  }
};

// Resource loading performance
export const trackResourceLoading = () => {
  window.addEventListener('load', () => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    resources.forEach((resource) => {
      if (resource.initiatorType === 'script' || resource.initiatorType === 'link') {
        const loadTime = resource.responseEnd - resource.startTime;
        
        const trace = {
          name: 'admin_dashboard_resource_load',
          value: loadTime,
          timestamp: Date.now(),
          labels: {
            resource_name: resource.name,
            resource_type: resource.initiatorType,
          },
        };
        
        sendToCloudMonitoring(trace);
      }
    });
  });
};

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}