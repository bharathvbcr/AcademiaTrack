# GitNexus-Style Community Map: AcademiaTrack Subsystems

Goal: expose subsystem ownership and wiring so agents can jump directly to the right files.

## Community Index

- **C1 Shell & App Composition**
- **C2 Feature Components**
- **C3 Hooked State Layer**
- **C4 Persistence & Data Model**
- **C5 Search & Index Runtime**
- **C6 Commanding & Discovery**
- **C7 Desktop Runtime Bridge**
- **C8 Settings & Profile Customization**
- **C9 Testing, Tooling, CI**
- **C10 Reference Data & Static Assets**

## Community Files

### C1 Shell & App Composition
`App.tsx`, `index.tsx`, `index.html`, `AGENTS.md`, `constants.ts`, `types.ts`, `utils.ts`

### C2 Feature Components
`components/AdvancedFilterBuilder.tsx`, `components/AdvancedSearchBar.tsx`, `components/ApplicationCard.tsx`, `components/ApplicationCard/index.tsx`, `components/ApplicationCard/subcomponents.tsx`, `components/ApplicationFormUI.tsx`, `components/ApplicationList.tsx`, `components/ApplicationModal.tsx`, `components/AutoCompleteInput.tsx`, `components/AutomationRuleBuilder.tsx`, `components/AutomationRulesModal.tsx`, `components/BudgetView.tsx`, `components/BulkActionsBar.tsx`, `components/BulkOperationsModal.tsx`, `components/CalendarView.tsx`, `components/ColumnConfigModal.tsx`, `components/CommandPalette.tsx`, `components/ComparisonModal.tsx`, `components/ComparisonView.tsx`, `components/ConfirmationModal.tsx`, `components/ContextMenu.tsx`, `components/CustomFieldsSection.tsx`, `components/DashboardSummary.tsx`, `components/DateInput.tsx`, `components/DocumentsSection.tsx`, `components/EmptyState.tsx`, `components/ErrorBoundary.tsx`, `components/EssaysSection.tsx`, `components/ExportConfigModal.tsx`, `components/FacultyContactModal.tsx`, `components/FacultyContactsSection.tsx`, `components/FacultyView.tsx`, `components/FinancialsSection.tsx`, `components/GeneralNotesSection.tsx`, `components/Header.tsx`, `components/HelpModal.tsx`, `components/KanbanBoard.tsx`, `components/KanbanCard.tsx`, `components/KanbanColumn.tsx`, `components/KanbanConfigModal.tsx`, `components/LoadingSpinner.tsx`, `components/MainContent.tsx`, `components/MarkdownEditor.tsx`, `components/ProgramDetailsSection.tsx`, `components/QuickCaptureModal.tsx`, `components/RankingsStatusSection.tsx`, `components/RecommenderSection.tsx`, `components/RecommendersView.tsx`, `components/RemindersSection.tsx`, `components/SearchFilters.tsx`, `components/SettingsModal.tsx`, `components/SkeletonLoader.tsx`, `components/SortControls.tsx`, `components/StatusBadge.tsx`, `components/SubmissionDetailsSection.tsx`, `components/TimelineView.tsx`, `components/TitleBar.tsx`, `components/Toast.tsx`, `components/Tooltip.tsx`, `components/UniversitySearchInput.tsx`, `components/ViewPresetModal.tsx`, `components/VirtualizedList.tsx`, `components/__tests__/CommandPalette.test.tsx`, `components/__tests__/FacultyContactModal.test.tsx`, `components/__tests__/QuickCaptureModal.test.tsx`, `components/.FullName`

### C3 Hooked State Layer
`hooks/useAdvancedAnalytics.ts`, `hooks/useAdvancedFilter.ts`, `hooks/useAdvancedSearch.ts`, `hooks/useAnimations.ts`, `hooks/useAppCommands.ts`, `hooks/useApplicationForm.ts`, `hooks/useApplications.ts`, `hooks/useAppModals.ts`, `hooks/useAutoComplete.ts`, `hooks/useAutomation.ts`, `hooks/useBulkSelection.ts`, `hooks/useClickOutside.ts`, `hooks/useCommandPalette.ts`, `hooks/useConfirmation.ts`, `hooks/useCustomFields.ts`, `hooks/useDarkMode.ts`, `hooks/useDataValidation.ts`, `hooks/useDebounce.ts`, `hooks/useEnhancedDragDrop.ts`, `hooks/useEnhancedKeyboardShortcuts.ts`, `hooks/useFocusManagement.ts`, `hooks/useKanbanConfig.ts`, `hooks/useKeyboardShortcuts.ts`, `hooks/useLocalStorage.ts`, `hooks/useLockBodyScroll.ts`, `hooks/useSortAndFilter.ts`, `hooks/useTemplates.ts`, `hooks/useThemeCustomization.ts`, `hooks/useToast.ts`, `hooks/useUndoRedo.ts`, `hooks/useUniversityData.ts`, `hooks/useViewState.ts`, `hooks/__tests__/useKeyboardShortcuts.test.tsx`

### C4 Persistence & Data Model
`hooks/useApplications.ts`, `utils/dataMigration.ts`, `utils/browserStorage.ts`, `utils/exportFields.ts`, `utils/exportFormats.ts`, `utils/formatters.ts`, `utils/calendarExport.ts`, `types/interfaces.ts`, `types/automation.ts`, `types/commands.ts`, `types/enums.ts`, `types/vendor.d.ts`, `hooks/useAdvancedFilter.ts`, `hooks/useAdvancedSearch.ts`, `hooks/useCustomFields.ts`, `hooks/useKanbanConfig.ts`, `hooks/useTemplates.ts`, `hooks/useThemeCustomization.ts`, `hooks/useViewState.ts`

### C5 Search & Index Runtime
`components/AdvancedSearchBar.tsx`, `hooks/useAdvancedSearch.ts`, `hooks/useAutoComplete.ts`, `hooks/useSortAndFilter.ts`, `utils/searchIndex.ts`, `utils/searchIndex.worker.ts`, `utils/searchIndexWorker.ts`, `utils/searchIndexWrapper.ts`

### C6 Commanding & Discovery
`components/CommandPalette.tsx`, `contexts/CommandContext.tsx`, `hooks/useAppCommands.ts`, `hooks/useEnhancedKeyboardShortcuts.ts`, `hooks/useKeyboardShortcuts.ts`, `hooks/useCommandPalette.ts`, `types/commands.ts`, `components/SettingsModal.tsx`, `contexts/__tests__/CommandContext.test.tsx`, `utils.ts`

### C7 Desktop Runtime Bridge
`electron/main.ts`, `electron/preload.ts`, `electron/tsconfig.json`, `lib/desktopBridge.ts`, `types/interfaces.ts`, `components/TitleBar.tsx`, `components/ErrorBoundary.tsx`, `hooks/useApplications.ts`, `hooks/useApplicationForm.ts`

### C8 Settings & Profile Customization
`hooks/useThemeCustomization.ts`, `hooks/useTemplates.ts`, `hooks/useCustomFields.ts`, `hooks/useViewState.ts`, `hooks/useKanbanConfig.ts`, `hooks/useEnhancedKeyboardShortcuts.ts`, `hooks/useAutomation.ts`, `components/SettingsModal.tsx`, `components/ViewPresetModal.tsx`, `components/AutomationRulesModal.tsx`, `components/ColumnConfigModal.tsx`, `components/Toast.tsx`

### C9 Testing, Tooling, CI
`tests/e2e/app-launch.spec.ts`, `tests/e2e/command-palette.spec.ts`, `tests/integration/module-linking.test.ts`, `components/__tests__/CommandPalette.test.tsx`, `components/__tests__/FacultyContactModal.test.tsx`, `components/__tests__/QuickCaptureModal.test.tsx`, `contexts/__tests__/CommandContext.test.tsx`, `hooks/__tests__/useKeyboardShortcuts.test.tsx`, `utils/__tests__/browserStorage.test.tsx`, `AGENTS.md`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/build.yml`, `.github/workflows/release.yml`, `.github/release-notes.md`, scripts

### C10 Reference Data & Static Assets
`src/data/universities.json`, `components/ApplicationCard.tsx`, `hooks/useUniversityData.ts`, `components/UniversitySearchInput.tsx`, `assets/entitlements.mac.plist`, `assets/icon.icns`, `assets/icon.ico.ico`, `assets/icon.png`, `assets/MicrosoftEdgeWebview2Setup.exe`, `public/AcademiaTrack.png`, `public/favicon.ico`, `AcademiaTrack.png`

## Cross-Community Contracts

### Core persistence path
- `C1 Shell` invokes `hooks` in `C3` for application state.
- `C3` state hooks read/write normalized data through `C4`.
- `C4` persistence adapters persist to either Electron IPC or browser `localStorage`.
- Browser persistence keys (notably `phd-applications`, `saved-searches`, `saved-filters`, `saved-keyboard-shortcuts`, etc.) are consumed by UI state in `C2/C3`.

### Commanding path
- `C1` sets up command registry in `C6`.
- `C6` builds command entries from `C2` views and `C3` state hooks.
- `C2` command palette renders command queries and executes bound callbacks back into `C1`.

### Desktop bridge path
- `C3` feature hooks call `window.desktop` in `C7` for file persistence and side-effects.
- `C7` forwards those calls to `electron/main.ts` handlers that interact with the local filesystem.
- `components/ErrorBoundary.tsx` and `components/TitleBar.tsx` also consume desktop contracts from `C7`.

### Search + views path
- `C2` search UI triggers `hooks/useAdvancedSearch.ts` in `C3`.
- `C3` search state is synchronized with `utils/searchIndex*` in `C5` for interactive results.

## Stability Notes

- `C7` runtime bridge contracts are strongly coupled with the desktop application lifecycle and require Electron process availability.
- `C4` contains the canonical migration boundary for `Application` schema changes (`CURRENT_DATA_VERSION = 3`).
- `C6` has dynamic command registration; stale command nodes in shared hooks/components should be expected as the application state changes.
