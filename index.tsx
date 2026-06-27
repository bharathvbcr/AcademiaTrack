import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { installDesktopBridge } from './lib/desktopBridge';
import { CommandProvider } from './contexts/CommandContext';

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
        // Avoid dumping full error objects / component stacks (which can echo
        // user-entered field values and app structure) in production builds.
        if (process.env.NODE_ENV !== 'production') {
          console.error('Application error:', error, errorInfo);
        } else {
          console.error('Application error:', error.message);
        }
      }}
    >
      <CommandProvider>
        <App />
      </CommandProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
