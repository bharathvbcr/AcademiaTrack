import React, { useState, useEffect } from 'react';
import type { WindowControls } from '../types/interfaces';
import { DESKTOP_BRIDGE_READY_EVENT, isDesktopRuntime, isMacOS } from '../lib/desktopBridge';

const getWindowControls = (): WindowControls | null =>
  typeof window === 'undefined' ? null : window.desktop?.windowControls ?? null;

const TitleBar: React.FC = () => {
  // On macOS the OS draws native traffic lights over the transparent title bar,
  // so we suppress our own min/maximize/close buttons and inset the title clear
  // of the traffic-light cluster.
  const isMac = isMacOS();
  const [isMaximized, setIsMaximized] = useState(false);
  const [controls, setControls] = useState<WindowControls | null>(() => getWindowControls());

  useEffect(() => {
    const refreshControls = () => {
      setControls(getWindowControls());
    };

    refreshControls();
    window.addEventListener(DESKTOP_BRIDGE_READY_EVENT, refreshControls);

    const interval = setInterval(() => {
      const nextControls = getWindowControls();
      if (nextControls) {
        setControls(nextControls);
        clearInterval(interval);
      }
    }, 50);

    return () => {
      window.removeEventListener(DESKTOP_BRIDGE_READY_EVENT, refreshControls);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!controls) return;

    let cancelled = false;
    controls.isMaximized()
      .then(value => {
        if (!cancelled) setIsMaximized(value);
      })
      .catch(() => {
        if (!cancelled) setIsMaximized(false);
      });

    const unsubscribe = controls.onMaximizeChange(setIsMaximized);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [controls]);

  const handleMinimize = () => {
    void controls?.minimize();
  };

  const handleMaximize = () => {
    void controls?.maximize();
  };

  const handleClose = () => {
    void controls?.close();
  };

  const handleDoubleClick = () => {
    void controls?.maximize();
  };

  if (!controls && !isDesktopRuntime()) {
    return null;
  }

  return (
    <div
      data-tauri-drag-region
      className="titlebar fixed top-0 left-0 right-0 h-9 bg-[#111113] border-b border-white/10 flex items-center justify-between select-none z-[9999] shadow-[0_1px_0_rgba(0,0,0,0.45)]"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      onDoubleClick={handleDoubleClick}
    >
      {/* App Logo and Title */}
      <div
        data-tauri-drag-region
        className={`flex items-center gap-2 min-w-0 ${isMac ? 'pl-[80px]' : 'pl-3'}`}
      >
        <img
          data-tauri-drag-region
          src="./AcademiaTrack.png"
          alt="AcademiaTrack"
          className="w-5 h-5 object-contain shrink-0"
        />
        <span data-tauri-drag-region className="text-white/90 text-sm font-medium truncate">
          AcademiaTrack
        </span>
      </div>

      {/* Window Controls — hidden on macOS, where native traffic lights apply */}
      {!isMac && (
      <div
        className="flex h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* Minimize */}
        <button
          onClick={handleMinimize}
          disabled={!controls}
          className="w-12 h-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Minimize"
        >
          <svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
            <rect width="10" height="1" />
          </svg>
        </button>

        {/* Maximize/Restore */}
        <button
          onClick={handleMaximize}
          disabled={!controls}
          className="w-12 h-full flex items-center justify-center text-white/75 hover:text-white hover:bg-white/10 transition-colors"
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
          disabled={!controls}
          className="w-12 h-full flex items-center justify-center text-white/75 hover:bg-red-600 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>
      </div>
      )}
    </div>
  );
};

export default TitleBar;
