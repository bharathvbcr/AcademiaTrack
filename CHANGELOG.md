# Changelog

All notable changes to this project will be documented in this file.

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