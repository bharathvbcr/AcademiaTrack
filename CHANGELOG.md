# Changelog

All notable changes to this project will be documented in this file.

## [3.1.0] - 2025-11-23

### Added
- **Location Auto-suggestion:** Integrated OpenStreetMap Nominatim API to suggest cities/states as you type in the application modal.
- **Timezone Integration:** Automatically fetches and stores Timezone ID, UTC offset, and DST status for the selected location using TimeAPI.io.
- **Enhanced Address Parsing:** Improved logic to correctly identify city names from various address fields (suburb, hamlet, municipality, etc.).

### Changed
- **Application Modal:** Replaced the plain text location input with a smart autocomplete search field.
- **Performance:** Implemented `useDebounce` hook to optimize API calls during location search.
- **Data Schema:** Updated `Application` type to include comprehensive `LocationDetails`.
