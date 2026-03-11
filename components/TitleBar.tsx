import React, { useState, useEffect } from 'react';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!window.desktop?.windowControls) return;

    // Get initial maximized state
    window.desktop.windowControls.isMaximized().then(setIsMaximized);

    // Listen for maximize changes
    const unsubscribe = window.desktop.windowControls.onMaximizeChange(setIsMaximized);
    return unsubscribe;
  }, []);

  const handleMinimize = () => {
    window.desktop?.windowControls?.minimize();
  };

  const handleMaximize = () => {
    window.desktop?.windowControls?.maximize();
  };

  const handleClose = () => {
    window.desktop?.windowControls?.close();
  };

  const handleDoubleClick = () => {
    window.desktop?.windowControls?.maximize();
  };

  // Don't render if the desktop runtime window controls are unavailable.
  if (!window.desktop?.windowControls) {
    return null;
  }

  return (
    <div
      className="titlebar fixed top-0 left-0 right-0 h-8 bg-slate-900 flex items-center justify-between select-none z-[9999]"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={handleDoubleClick}
    >
      {/* App Logo and Title */}
      <div className="flex items-center gap-2 pl-2">
        <img
          src="./AcademiaTrack.png"
          alt="AcademiaTrack"
          className="w-5 h-5 object-contain"
        />
        <span className="text-white/90 text-sm font-medium tracking-tight">
          AcademiaTrack
        </span>
      </div>

      {/* Window Controls */}
      <div
        className="flex h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            // Restore icon (two overlapping squares)
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M2 3v5h5V3H2z" />
              <path d="M3 3V1h5v5H7" />
            </svg>
          ) : (
            // Maximize icon (single square)
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="0.5" y="0.5" width="9" height="9" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-white/70 hover:bg-red-600 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
