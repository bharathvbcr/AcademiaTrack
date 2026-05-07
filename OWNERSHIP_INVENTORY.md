# File-by-File Ownership Inventory

Purpose: deterministic ownership mapping for every tracked file in this repository.

## Ownership Legend

- **Shell & App Compose**: bootstrapping, routing, root composition, and app orchestration.
- **Renderer-UI**: feature screens and UI components.
- **Renderer-Commands**: command palette, command dispatch, keyboard shortcuts.
- **State/Hook**: state orchestration and mutation hooks.
- **Persistence**: schema, migration, and durable read/write adapters.
- **Desktop Runtime**: Electron main/preload process and local FS bridge.
- **Data/Model**: domain types, constants, and transformation logic.
- **Search/Index**: search indexing/query execution.
- **Testing**: unit/e2e/integration test surfaces.
- **Build/Operations**: scripts, CI, releases, and release-adjacent docs.
- **Map/Maps**: GitNexus/agent-reference artifacts.

## Root Files

- `.claude/settings.local.json` — Map/Maps
- `.env.local` — Shell & App Compose
- `.github/release-notes.md` — Build/Operations
- `.github/workflows/build.yml` — Build/Operations
- `.github/workflows/release.yml` — Build/Operations
- `.gitignore` — Build/Operations
- `.nvmrc` — Build/Operations
- `AGENTS.md` — Map/Maps
- `AcademiaTrack.png` — Renderer-UI
- `App.tsx` — Shell & App Compose
- `CALL_CHAIN_PERSISTENCE.md` — Map/Maps
- `CHANGELOG.md` — Build/Operations
- `COMMUNITY_MAP_SUBSYSTEM.md` — Map/Maps
- `IMPLEMENTATION_STATUS.md` — Build/Operations
- `LICENSE` — Build/Operations
- `OWNERSHIP_INVENTORY.md` — Map/Maps
- `POWER_USER_AUDIT_REPORT.md` — Build/Operations
- `README.md` — Shell & App Compose
- `SECURITY.md` — Build/Operations
- `assets/MicrosoftEdgeWebview2Setup.exe` — Build/Operations
- `assets/entitlements.mac.plist` — Build/Operations
- `assets/icon.icns` — Map/Maps
- `assets/icon.ico.ico` — Map/Maps
- `assets/icon.png` — Map/Maps
- `build-profile.json` — Build/Operations
- `build-timings.json` — Build/Operations
- `constants.ts` — Data/Model
- `index.html` — Shell & App Compose
- `index.tsx` — Shell & App Compose
- `log-analysis-report.md` — Build/Operations
- `metadata.json` — Data/Model
- `package-lock.json` — Build/Operations
- `package.json` — Build/Operations
- `playwright.config.ts` — Testing
- `public/AcademiaTrack.png` — Map/Maps
- `public/favicon.ico` — Map/Maps
- `scripts/build-profiler.cjs` — Build/Operations
- `scripts/generate-release-notes.cjs` — Build/Operations
- `scripts/log-analyzer.cjs` — Build/Operations
- `scripts/measure-build.cjs` — Build/Operations
- `scripts/verify-map-coverage.js` — Build/Operations + Map/Maps
- `src/data/universities.json` — Data/Model
- `src/test/setup.ts` — Testing
- `tsconfig.json` — Shell & App Compose
- `types.ts` — Data/Model
- `types/automation.ts` — Data/Model
- `types/commands.ts` — Data/Model
- `types/enums.ts` — Data/Model
- `types/interfaces.ts` — Data/Model
- `types/vendor.d.ts` — Data/Model
- `utils.ts` — Data/Model
- `vite.config.ts` — Build/Operations
- `vitest.config.ts` — Testing

## Components

- `components/.FullName` — Renderer-UI (artifact)
- `components/AdvancedFilterBuilder.tsx` — Renderer-UI
- `components/AdvancedAnalyticsPanel.tsx` — Renderer-UI + State/Hook
- `components/AdvancedSearchBar.tsx` — Renderer-UI + Search/Index
- `components/ApplicationCard.tsx` — Renderer-UI
- `components/ApplicationCard/index.tsx` — Renderer-UI
- `components/ApplicationCard/subcomponents.tsx` — Renderer-UI
- `components/ApplicationFormUI.tsx` — Renderer-UI
- `components/ApplicationList.tsx` — Renderer-UI
- `components/ApplicationModal.tsx` — Renderer-UI
- `components/AutoCompleteInput.tsx` — Renderer-UI
- `components/AutomationRuleBuilder.tsx` — Renderer-UI
- `components/AutomationRulesModal.tsx` — Renderer-UI + Renderer-Commands
- `components/BudgetView.tsx` — Renderer-UI
- `components/BulkActionsBar.tsx` — Renderer-UI
- `components/BulkOperationsModal.tsx` — Renderer-UI
- `components/CalendarView.tsx` — Renderer-UI
- `components/ColumnConfigModal.tsx` — Renderer-UI
- `components/CommandPalette.tsx` — Renderer-Commands
- `components/ComparisonModal.tsx` — Renderer-UI
- `components/ComparisonView.tsx` — Renderer-UI
- `components/ConfirmationModal.tsx` — Renderer-UI
- `components/ContextMenu.tsx` — Renderer-UI
- `components/CustomFieldsSection.tsx` — Renderer-UI
- `components/DashboardSummary.tsx` — Renderer-UI
- `components/DataValidationPanel.tsx` — Renderer-UI + State/Hook
- `components/DateInput.tsx` — Renderer-UI
- `components/DocumentsSection.tsx` — Renderer-UI
- `components/EmptyState.tsx` — Renderer-UI
- `components/ErrorBoundary.tsx` — Renderer-UI + Persistence
- `components/EssaysSection.tsx` — Renderer-UI
- `components/ExportConfigModal.tsx` — Renderer-UI
- `components/FacultyContactModal.tsx` — Renderer-UI
- `components/FacultyContactsSection.tsx` — Renderer-UI
- `components/FacultyView.tsx` — Renderer-UI
- `components/FinancialsSection.tsx` — Renderer-UI
- `components/GeneralNotesSection.tsx` — Renderer-UI
- `components/Header.tsx` — Renderer-UI
- `components/HelpModal.tsx` — Renderer-UI
- `components/KanbanBoard.tsx` — Renderer-UI
- `components/KanbanCard.tsx` — Renderer-UI
- `components/KanbanColumn.tsx` — Renderer-UI
- `components/KanbanConfigModal.tsx` — Renderer-UI
- `components/LoadingSpinner.tsx` — Renderer-UI
- `components/MainContent.tsx` — Renderer-UI
- `components/MarkdownEditor.tsx` — Renderer-UI
- `components/ProgramDetailsSection.tsx` — Renderer-UI
- `components/QuickCaptureModal.tsx` — Renderer-UI
- `components/RankingsStatusSection.tsx` — Renderer-UI
- `components/RecommenderSection.tsx` — Renderer-UI
- `components/RecommendersView.tsx` — Renderer-UI
- `components/RemindersSection.tsx` — Renderer-UI
- `components/SearchFilters.tsx` — Renderer-UI + Search/Index
- `components/SettingsModal.tsx` — Renderer-UI + Renderer-Commands
- `components/SkeletonLoader.tsx` — Renderer-UI
- `components/SortControls.tsx` — Renderer-UI
- `components/StatusBadge.tsx` — Renderer-UI
- `components/SubmissionDetailsSection.tsx` — Renderer-UI
- `components/TimelineView.tsx` — Renderer-UI
- `components/TitleBar.tsx` — Renderer-UI + Desktop Runtime
- `components/Toast.tsx` — Renderer-UI
- `components/Tooltip.tsx` — Renderer-UI
- `components/UniversitySearchInput.tsx` — Renderer-UI + Search/Index
- `components/ViewPresetModal.tsx` — Renderer-UI
- `components/VirtualizedList.tsx` — Renderer-UI
- `components/__tests__/CommandPalette.test.tsx` — Testing
- `components/__tests__/AdvancedSearchBar.test.tsx` — Testing
- `components/__tests__/ApplicationList.wiring.test.tsx` — Testing
- `components/__tests__/FacultyContactModal.test.tsx` — Testing
- `components/__tests__/QuickCaptureModal.test.tsx` — Testing
- `components/__tests__/SettingsWiring.test.tsx` — Testing

## Contexts

- `contexts/CommandContext.tsx` — Renderer-Commands
- `contexts/__tests__/CommandContext.test.tsx` — Testing

## Desktop Runtime

- `electron/main.ts` — Desktop Runtime
- `electron/preload.ts` — Desktop Runtime
- `electron/tsconfig.json` — Desktop Runtime
- `lib/desktopBridge.ts` — Desktop Runtime

## Hooks

- `hooks/__tests__/useKeyboardShortcuts.test.tsx` — Testing
- `hooks/__tests__/useLocalStorage.test.tsx` — Testing
- `hooks/useAdvancedAnalytics.ts` — State/Hook
- `hooks/useAdvancedFilter.ts` — State/Hook + Persistence
- `hooks/useAdvancedSearch.ts` — State/Hook + Search/Index + Persistence
- `hooks/useAnimations.ts` — State/Hook
- `hooks/useAppCommands.ts` — Renderer-Commands + State/Hook
- `hooks/useAppModals.ts` — State/Hook
- `hooks/useApplicationForm.ts` — State/Hook + Desktop Runtime
- `hooks/useApplications.ts` — State/Hook + Persistence
- `hooks/useAutoComplete.ts` — State/Hook + Search/Index
- `hooks/useAutomation.ts` — State/Hook + Persistence
- `hooks/useBulkSelection.ts` — State/Hook
- `hooks/useClickOutside.ts` — State/Hook
- `hooks/useCommandPalette.ts` — Renderer-Commands
- `hooks/useConfirmation.ts` — State/Hook
- `hooks/useCustomFields.ts` — State/Hook + Persistence
- `hooks/useDarkMode.ts` — State/Hook
- `hooks/useDataValidation.ts` — State/Hook
- `hooks/useDebounce.ts` — State/Hook
- `hooks/useEnhancedDragDrop.ts` — State/Hook
- `hooks/useEnhancedKeyboardShortcuts.ts` — Renderer-Commands + Persistence
- `hooks/useFocusManagement.ts` — State/Hook
- `hooks/useKanbanConfig.ts` — State/Hook + Persistence
- `hooks/useKeyboardShortcuts.ts` — Renderer-Commands + State/Hook
- `hooks/useLocalStorage.ts` — Persistence
- `hooks/useLockBodyScroll.ts` — State/Hook
- `hooks/useSortAndFilter.ts` — State/Hook
- `hooks/useTemplates.ts` — State/Hook + Persistence
- `hooks/useThemeCustomization.ts` — State/Hook + Persistence
- `hooks/useToast.ts` — State/Hook
- `hooks/useUndoRedo.ts` — State/Hook
- `hooks/useUniversityData.ts` — State/Hook + Data/Model
- `hooks/useViewState.ts` — State/Hook + Persistence

## Utils

- `utils/__tests__/browserStorage.test.ts` — Testing
- `utils/browserStorage.ts` — Persistence
- `utils/calendarExport.ts` — Data/Model
- `utils/dataMigration.ts` — Persistence
- `utils/exportFields.ts` — Data/Model
- `utils/exportFormats.ts` — Data/Model
- `utils/formatters.ts` — Data/Model
- `utils/locationService.ts` — Data/Model
- `utils/motion.ts` — Renderer-UI
- `utils/searchIndex.ts` — Search/Index
- `utils/searchIndex.worker.ts` — Search/Index
- `utils/searchIndexWorker.ts` — Search/Index
- `utils/searchIndexWrapper.ts` — Search/Index

## Test Suites

- `tests/e2e/app-launch.spec.ts` — Testing
- `tests/e2e/command-palette.spec.ts` — Testing
- `tests/integration/module-linking.test.ts` — Testing

## Ownership Routing

- UI-triggered persistence flow ownership: `components/*` → `hooks/*` → `utils/dataMigration.ts` + `utils/browserStorage.ts` (web) or `electron/main.ts` + `electron/preload.ts` (desktop).
- Command flow ownership: `components/CommandPalette.tsx` → `hooks/useAppCommands.ts` / `hooks/useCommandPalette.ts` → `contexts/CommandContext.tsx` → component handlers.
- Desktop file APIs: `hooks/useApplicationForm.ts` + `hooks/useApplications.ts` → `lib/desktopBridge.ts` → `electron/main.ts`.
