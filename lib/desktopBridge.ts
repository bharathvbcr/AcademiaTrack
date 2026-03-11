import type { DesktopAPI } from "../types/interfaces";

// With Electron, the desktop API is injected via contextBridge in preload.ts.
// We keep this function for backwards compatibility with the existing application flow.
export function installDesktopBridge() {
  if (typeof window !== "undefined" && window.desktop) {
    // The desktop API is already available (injected by Electron preload script)
    // We can alias it to electron for legacy code if needed
    if (!window.electron) {
      window.electron = window.desktop;
    }
    return;
  }
}
