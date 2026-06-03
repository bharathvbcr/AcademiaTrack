## Patch Notes

## [5.3.0] - 2026-06-03

### Changed
- **Desktop Runtime:** Tauri is now the mainstream desktop build path through `npm run dev:desktop`, `npm run build:desktop`, and `npm run package`.
- **Legacy Electron:** Electron commands are retained only under `legacy:electron:*` and deprecated compatibility aliases.

### Fixed
- **Tauri Branding:** Regenerated the Tauri app, installer, and tile icons from the AcademiaTrack logo.
- **Window Chrome:** Hardened the custom title bar so Tauri minimize, maximize/restore, and close controls appear when the desktop bridge is ready.

## [5.1.0] - 2026-03-10

### Changed
- **Desktop Runtime:** Standardized the app-facing desktop bridge on `window.desktop` while preserving `window.electron` as a compatibility alias.
- **Build Scripts:** Promoted `npm run dev:desktop` and `npm run build:desktop` as the primary Electrobun commands, with legacy Electron-named scripts kept as aliases.

### Fixed
- **TypeScript:** Resolved the remaining type errors across the command palette, desktop bridge, Electrobun RPC schema, and Bun main-process runtime wiring.
- **Testing:** Updated the command palette and desktop smoke tests to match the current Electrobun runtime and Playwright expectations.

### CI/CD
- **GitHub Actions:** Split verification builds from tag-based releases so tagged versions publish packaged desktop artifacts through GitHub Releases.

[Full changelog](https://github.com/bharathvbcr/AcademiaTrack/blob/main/CHANGELOG.md)
