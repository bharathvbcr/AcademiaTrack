# Changelog

All notable changes to this project will be documented in this file.

## [5.2.3] - 2026-05-07

### Added
- **Auto Release:** Release workflow now publishes a non-draft GitHub release automatically when a versioned change lands on `main`.
- **Repository Maps:** Added GitNexus map ownership artifacts and a map coverage verification script.

### Fixed
- **Mapped UI Wiring:** Wired advanced search zero-result handling, search index population, desktop backup/update controls, data validation, analytics, templates, column configuration, context menu actions, autocomplete, drag/drop status updates, and submission details.
- **Runtime Stability:** Moved command context to the app root, hardened local storage saves, and replaced the dashboard chart path that crashed production preview smoke.

## [5.2.2] - 2026-04-22

### Fixed
- **Release Publishing:** Narrowed GitHub Actions release uploads to packaged installers and updater metadata so tagged builds no longer try to publish unpacked app directories and trip GitHub secondary rate limits.

## [5.2.1] - 2026-04-22

### Changed
- **TypeScript Toolchain:** Switched project typechecking and Electron compilation to the native TypeScript 7 beta `tsgo` compiler while keeping the TypeScript 6 compatibility package installed for ecosystem tooling.
- **CI/CD:** Updated GitHub verification and release workflows to run the repo's real `npm run typecheck` command instead of stale `tsc` invocations.

### Fixed
- **Browser Storage:** Hardened application persistence, search-index metadata caching, and logo caching so missing or malformed browser storage no longer throws noisy runtime or test errors.
- **Build Output:** Removed the previous Vite circular chunk and mixed static/dynamic import warnings by simplifying chunking and isolating export field helpers into a shared module.

## [5.2.0] - 2026-03-11

### Changed
- **Runtime Migration:** Successfully migrated the entire application from Electrobun/Bun to a standard Electron/Node.js setup for improved stability and packaging reliability on Windows.
- **Main Process:** Re-implemented the desktop integration layer using Electron's `ipcMain` and `app` modules.
- **Preload Bridge:** Re-implemented the desktop bridge using Electron's `contextBridge` for enhanced security.
- **Build System:** Switched to `electron-builder` for multi-platform packaging and `electron-updater` for OTA updates.

### Removed
- All Electrobun and Bun dependencies, configurations, and patches.

## [5.1.5] - 2026-03-11

### Added
- **Windows Reliability:** Integrated the official Microsoft WebView2 Evergreen Bootstrapper into the Windows `.exe` to gracefully handle offline/enterprise machines missing the WebView2 runtime.


## [5.1.4] - 2026-03-10

### Changed
- **Release Validation:** Added a follow-up hardening pass and duplicate release safeguards for tagged releases.

## [5.1.0] - 2026-03-10

### Changed
- **Desktop Runtime:** Standardized the app-facing desktop bridge on `window.desktop` while preserving `window.electron` as a compatibility alias.
- **Build Scripts:** Promoted `npm run dev:desktop` and `npm run build:desktop` as the primary Electrobun commands, with legacy Electron-named scripts kept as aliases.

### Fixed
- **TypeScript:** Resolved the remaining type errors across the command palette, desktop bridge, Electrobun RPC schema, and Bun main-process runtime wiring.
- **Testing:** Updated the command palette and desktop smoke tests to match the current Electrobun runtime and Playwright expectations.

### CI/CD
- **GitHub Actions:** Split verification builds from tag-based releases so tagged versions publish packaged desktop artifacts through GitHub Releases.

## [5.1.3] - 2026-03-11

### Changed
- **Release Metadata:** Added stricter tag, lockfile, changelog, and duplicate-release validation in the release workflow.

## [5.1.2] - 2026-03-10

### Changed
- **Release Pipeline:** Hardened release tag and metadata validation, and switched release artifacts to matrix-based collection with per-OS artifact naming.

## [4.2.2] - 2025-12-14

### Fixed
- **Document Attachments:** Implemented file attachment handlers for documents section (was placeholder functions that did nothing when clicked).
- **Build:** Renamed `notarize.js` to `notarize.cjs` for ES module compatibility in electron-builder.

### Added
- **Essay Draft Attachments:** Added file attachment support for essay drafts with attach/open/remove functionality.

## [4.2.1] - 2025-12-12

### Added
- **Auto-Updates:** Integrated `electron-updater` for automatic update checking and installation from GitHub releases.
- **Version Info:** New `get-version-info` IPC handler exposing app version, platform, architecture, and runtime versions.
- **Windows Portable:** Added portable .exe target that runs without installation.
- **ARM64 Builds:** Added Apple Silicon (arm64) support for macOS, and arm64 targets for Windows and Linux.
- **Transition Animations:** Added smooth page transitions, card entrance animations, and modal animations using framer-motion.
- **Loading Spinner:** New `LoadingSpinner` component with animated spinner and size variants.

### Changed
- **Dashboard:** Replaced "Acceptance Rate" metric with "Rejected" count for more actionable information.
- **Build Compression:** Set to `maximum` for smaller installer sizes.
- **README:** Expanded with cross-platform installation instructions (Windows, macOS, Linux), development setup, and code signing documentation.

### Performance
- **ApplicationList:** Added `React.memo`, `useMemo` for progress calculations, and `useCallback` for click handlers.
- **Artifact Naming:** Improved build artifact naming with version, OS, and architecture.

### Security
- **Code Signing:** Added macOS notarization support and entitlements configuration (optional, disabled by default).

## [3.5.0] - 2025-11-29

### Security
- **Fixed:** ID generation now uses `crypto.randomUUID()` instead of `Date.now()` to ensure uniqueness and prevent collisions.
- **Fixed:** Implemented atomic file writing for data persistence to prevent data corruption during app crashes.
- **Fixed:** Removed API key injection (`GEMINI_API_KEY`) from client-side build bundles to prevent potential exposure.

### Fixed
- **UI:** Resolved an issue where application cards were invisible in the list view by removing conflicting `framer-motion` animations.
- **Type Safety:** Corrected loose types in `App.tsx` and `utils.ts`, and standardized `FacultyContact` IDs.
- **Data Integrity:** Standardized date parsing in `KanbanCard.tsx` and improved data initialization in `useApplications.ts`.
- **Stability:** Added error handling for application save operations to prevent crashes.

### Performance
- **Optimization:** Implemented debouncing (1s delay) for data saving to reduce excessive disk I/O and improve UI responsiveness.
- **Optimization:** Lazy-loaded the large `universities.json` dataset (1.8MB) so it only loads on demand when searching, significantly speeding up initial app load.
- **Build:** Optimized build chunks by separating vendor libraries and large data files, resolving build size warnings.

### Added
- **Feature:** Added a reusable `ConfirmationModal` component for a smoother, non-blocking user experience.
- **Feature:** Implemented periodic deadline checks (hourly) to ensure notifications are triggered even if the app remains open for long periods.

### Changed
- **UI/UX:** Replaced native blocking `window.confirm` and `window.alert` dialogs with custom modals and system notifications.

## [3.1.1] - 2025-11-23

### Fixed
- **Location Search:** Fixed an issue where location suggestions were not appearing by adding a required `User-Agent` header to OpenStreetMap API requests.
- **UI:** Fixed suggestion dropdown visibility logic to ensure it appears reliably while typing.
- **Search Logic:** Prevented unnecessary API calls and search loops when a location is selected.

## [3.1.0] - 2025-11-23

### Added
- **Location Auto-suggestion:** Integrated OpenStreetMap Nominatim API to suggest cities/states as you type in the application modal.
- **Timezone Integration:** Automatically fetches and stores Timezone ID, UTC offset, and DST status for the selected location using TimeAPI.io.
- **Enhanced Address Parsing:** Improved logic to correctly identify city names from various address fields (suburb, hamlet, municipality, etc.).

### Changed
- **Application Modal:** Replaced the plain text location input with a smart autocomplete search field.
- **Performance:** Implemented `useDebounce` hook to optimize API calls during location search.
- **Data Schema:** Updated `Application` type to include comprehensive `LocationDetails`.

