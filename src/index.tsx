import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import { initializePerformanceMonitoring } from './utils/performance';

// Initialize performance monitoring in production
// if (process.env.NODE_ENV === 'production') {
//   initializePerformanceMonitoring();
// }

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);