import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { installDesktopBridge } from './lib/desktopBridge';

installDesktopBridge();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to external service if needed
        console.error('Application error:', error, errorInfo);
      }}
    >
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
