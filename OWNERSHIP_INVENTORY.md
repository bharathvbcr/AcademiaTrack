# File-by-File Ownership Inventory

Purpose: deterministic ownership mapping for every tracked file in this repository.

## Ownership Legend

- **Shell & App Compose**: bootstrapping, routing, root composition, and app orchestration.
- **Renderer-UI**: feature screens and UI components.
- **Renderer-Commands**: command palette, command dispatch, keyboard shortcuts.
- **State/Hook**: state orchestration and mutation hooks.
- **Persistence**: schema, migration, and durable read/write adapters.
- **Desktop Runtime**: Tauri shell, legacy Electron main/preload process, and local FS bridge.
- **Data/Model**: domain types, constants, and transformation logic.
- **Search/Index**: search indexing/query execution.
- **Testing**: unit/e2e/integration test surfaces.
- **Build/Operations**: scripts, CI, releases, and release-adjacent docs.
- **Map/Maps**: agent-reference map artifacts.

## Root Files

- `.github/commands/gemini-invoke.toml` — Build/Operations
- `.github/commands/gemini-plan-execute.toml` — Build/Operations
- `.github/commands/gemini-review.toml` — Build/Operations
- `.github/commands/gemini-scheduled-triage.toml` — Build/Operations
- `.github/commands/gemini-triage.toml` — Build/Operations
- `.github/dependabot.yml` — Build/Operations
- `.github/release-notes.md` — Build/Operations
- `.github/workflows/build.yml` — Build/Operations
- `.github/workflows/bun-audit.yml` — Build/Operations
- `.github/workflows/gemini-dispatch.yml` — Build/Operations
- `.github/workflows/gemini-invoke.yml` — Build/Operations
- `.github/workflows/gemini-plan-execute.yml` — Build/Operations
- `.github/workflows/gemini-review.yml` — Build/Operations
- `.github/workflows/gemini-scheduled-triage.yml` — Build/Operations
- `.github/workflows/gemini-triage.yml` — Build/Operations
- `.github/workflows/release.yml` — Build/Operations
- `.claude/settings.local.json` — Build/Operations
- `.devcouncil/config.yaml` — Build/Operations
- `.env.example` — Build/Operations
- `.env.local` — Build/Operations
- `.gitignore` — Build/Operations
- `.nvmrc` — Build/Operations
- `AGENTS.md` — Map/Maps
- `AcademiaTrack.png` — Renderer-UI
- `App.tsx` — Shell & App Compose
- `CALL_CHAIN_PERSISTENCE.md` — Map/Maps
- `CHANGELOG.md` — Build/Operations
- `CLAUDE.md` — Map/Maps
- `COMMUNITY_MAP_SUBSYSTEM.md` — Map/Maps
- `docs/semantic-layer/ARCHITECTURE.md` — Build/Operations
- `examples/semantic_pipeline_demo.py` — Shell & App Compose
- `IMPLEMENTATION_STATUS.md` — Build/Operations
- `LICENSE` — Build/Operations
- `lib/__tests__/desktopBridge.test.ts` — Testing
- `OWNERSHIP_INVENTORY.md` — Map/Maps
- `README.md` — Shell & App Compose
- `requirements-semantic.txt` — Build/Operations
- `SECURITY.md` — Build/Operations
- `SIGNING.md` — Build/Operations
- `bun.lock` — Build/Operations
- `bunfig.toml` — Build/Operations
- `assets/MicrosoftEdgeWebview2Setup.exe` — Build/Operations
- `assets/entitlements.mac.plist` — Build/Operations
- `assets/icon.icns` — Map/Maps
- `assets/icon.ico.ico` — Map/Maps
- `assets/icon.png` — Map/Maps
- `constants.ts` — Data/Model
- `index.html` — Shell & App Compose
- `index.css` — Renderer-UI
- `index.tsx` — Shell & App Compose
- `metadata.json` — Data/Model
- `package.json` — Build/Operations
- `playwright.config.ts` — Testing
- `public/AcademiaTrack.png` — Map/Maps
- `public/favicon.ico` — Map/Maps
- `public/social-preview.png` — Renderer-UI
- `scripts/build-profiler.cjs` — Build/Operations
- `scripts/check-version-consistency.cjs` — Build/Operations
- `scripts/dev.mjs` — Build/Operations
- `scripts/generate-release-notes.cjs` — Build/Operations
- `scripts/import-apple-cert.sh` — Build/Operations
- `scripts/log-analyzer.cjs` — Build/Operations
- `scripts/measure-build.cjs` — Build/Operations
- `scripts/verify-map-coverage.js` — Build/Operations + Map/Maps
- `scripts/vite-plugin-semantic-sidecar.mjs` — Build/Operations
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
- `vite-env.d.ts` — Shell & App Compose
- `vite.config.ts` — Build/Operations
- `vitest.config.ts` — Testing

## Components

- `components/AdvancedFilterBuilder.tsx` — Renderer-UI
- `components/AdvancedAnalyticsPanel.tsx` — Renderer-UI + State/Hook
- `components/AIAssistantModal.tsx` — Renderer-UI
- `components/AISettingsPanel.tsx` — Renderer-UI
- `components/AdvancedSearchBar.tsx` — Renderer-UI + Search/Index
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
- `components/DashboardAIBriefing.tsx` — Renderer-UI + State/Hook
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
- `components/__tests__/App.view-switching.test.tsx` — Testing
- `components/__tests__/CommandPalette.test.tsx` — Testing
- `components/__tests__/AdvancedSearchBar.test.tsx` — Testing
- `components/__tests__/ApplicationList.wiring.test.tsx` — Testing
- `components/__tests__/DashboardAIBriefing.test.tsx` — Testing
- `components/__tests__/FacultyContactModal.test.tsx` — Testing
- `components/__tests__/Header.view-switching.test.tsx` — Testing
- `components/__tests__/QuickCaptureModal.test.tsx` — Testing
- `components/__tests__/SettingsWiring.test.tsx` — Testing

## Contexts

- `contexts/ApplicationActionsContext.tsx` — State/Hook
- `contexts/BulkSelectionContext.tsx` — State/Hook
- `contexts/CommandContext.tsx` — Renderer-Commands
- `contexts/__tests__/CommandContext.test.tsx` — Testing

## Desktop Runtime

- `lib/desktopBridge.ts` — Desktop Runtime
- `src-tauri/.gitignore` — Build/Operations
- `src-tauri/Cargo.lock` — Build/Operations
- `src-tauri/Cargo.toml` — Build/Operations
- `src-tauri/build.rs` — Desktop Runtime
- `src-tauri/capabilities/default.json` — Desktop Runtime
- `src-tauri/icons/128x128.png` — Map/Maps
- `src-tauri/icons/128x128@2x.png` — Map/Maps
- `src-tauri/icons/32x32.png` — Map/Maps
- `src-tauri/icons/Square107x107Logo.png` — Map/Maps
- `src-tauri/icons/Square142x142Logo.png` — Map/Maps
- `src-tauri/icons/Square150x150Logo.png` — Map/Maps
- `src-tauri/icons/Square284x284Logo.png` — Map/Maps
- `src-tauri/icons/Square30x30Logo.png` — Map/Maps
- `src-tauri/icons/Square310x310Logo.png` — Map/Maps
- `src-tauri/icons/Square44x44Logo.png` — Map/Maps
- `src-tauri/icons/Square71x71Logo.png` — Map/Maps
- `src-tauri/icons/Square89x89Logo.png` — Map/Maps
- `src-tauri/icons/StoreLogo.png` — Map/Maps
- `src-tauri/icons/installer-header.bmp` — Map/Maps
- `src-tauri/icons/installer-sidebar.bmp` — Map/Maps
- `src-tauri/icons/icon.icns` — Map/Maps
- `src-tauri/icons/icon.ico` — Map/Maps
- `src-tauri/icons/icon.png` — Map/Maps
- `src-tauri/src/lib.rs` — Desktop Runtime
- `src-tauri/src/main.rs` — Desktop Runtime
- `src-tauri/src/semantic_sidecar.rs` — Desktop Runtime
- `src-tauri/tauri.conf.json` — Desktop Runtime

## Hooks

- `hooks/__tests__/useAI.test.tsx` — Testing
- `hooks/__tests__/useApplications.test.tsx` — Testing
- `hooks/__tests__/useEscapeKey.test.tsx` — Testing
- `hooks/__tests__/useKeyboardShortcuts.test.tsx` — Testing
- `hooks/__tests__/useLocalStorage.test.tsx` — Testing
- `hooks/useAdvancedAnalytics.ts` — State/Hook
- `hooks/useAI.ts` — State/Hook + Persistence
- `hooks/useAdvancedFilter.ts` — State/Hook + Persistence
- `hooks/useAdvancedSearch.ts` — State/Hook + Search/Index + Persistence
- `hooks/useAnimations.ts` — State/Hook
- `hooks/useAcceptanceConfetti.ts` — State/Hook
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
- `hooks/useEscapeKey.ts` — State/Hook
- `hooks/useFocusManagement.ts` — State/Hook
- `hooks/useKanbanConfig.ts` — State/Hook + Persistence
- `hooks/useKeyboardShortcuts.ts` — Renderer-Commands + State/Hook
- `hooks/useLocalStorage.ts` — Persistence
- `hooks/useLockBodyScroll.ts` — State/Hook
- `hooks/useSemanticSidecar.ts` — State/Hook
- `hooks/useSortAndFilter.ts` — State/Hook
- `hooks/useTemplates.ts` — State/Hook + Persistence
- `hooks/useThemeCustomization.ts` — State/Hook + Persistence
- `hooks/useToast.ts` — State/Hook
- `hooks/useUndoRedo.ts` — State/Hook
- `hooks/useUniversityData.ts` — State/Hook + Data/Model
- `hooks/useUniversityLogo.ts` — State/Hook
- `hooks/useViewState.ts` — State/Hook + Persistence

## Services

- `services/ai/__tests__/prompts.test.ts` — Testing
- `services/ai/__tests__/providers.test.ts` — Testing
- `services/ai/__tests__/semantic.test.ts` — Testing
- `services/ai/__tests__/semanticAuth.test.ts` — Testing
- `services/ai/__tests__/semanticSidecar.test.ts` — Testing
- `services/ai/chat.ts` — Shell & App Compose
- `services/ai/index.ts` — Data/Model
- `services/ai/ollama.ts` — Data/Model
- `services/ai/openaiCompatible.ts` — Data/Model
- `services/ai/prompts.ts` — Data/Model
- `services/ai/semanticBridge.ts` — Desktop Runtime
- `services/ai/semanticSidecar.ts` — Desktop Runtime
- `services/ai/stream.ts` — Data/Model
- `services/ai/types.ts` — Data/Model

## Semantic Layer (Python Sidecar)

- `semantic_layer/__init__.py` — Shell & App Compose
- `semantic_layer/__main__.py` — Shell & App Compose
- `semantic_layer/adapters.py` — Shell & App Compose
- `semantic_layer/benchmarks/__init__.py` — Testing
- `semantic_layer/benchmarks/latency_benchmark.py` — Testing
- `semantic_layer/benchmarks/results/README.md` — Testing
- `semantic_layer/benchmarks/results/mock_500.json` — Testing
- `semantic_layer/benchmarks/results/real_minilm_500.json` — Testing
- `semantic_layer/cache/__init__.py` — Persistence
- `semantic_layer/cache/base.py` — Persistence
- `semantic_layer/cache/chroma_cache.py` — Persistence
- `semantic_layer/cache/faiss_cache.py` — Persistence
- `semantic_layer/compressor/__init__.py` — Data/Model
- `semantic_layer/compressor/rag_compressor.py` — Data/Model
- `semantic_layer/config.py` — Shell & App Compose
- `semantic_layer/embeddings.py` — Search/Index
- `semantic_layer/examples/__init__.py` — Shell & App Compose
- `semantic_layer/examples/basic_pipeline.py` — Shell & App Compose
- `semantic_layer/metrics.py` — Build/Operations
- `semantic_layer/orchestrator.py` — Shell & App Compose
- `semantic_layer/pipeline.py` — Shell & App Compose
- `semantic_layer/requirements.txt` — Build/Operations
- `semantic_layer/router/__init__.py` — Shell & App Compose
- `semantic_layer/router/complexity_router.py` — Shell & App Compose
- `semantic_layer/server.py` — Shell & App Compose
- `semantic_layer/threshold.py` — Data/Model
- `semantic_layer/threshold_tuner.py` — Data/Model
- `semantic_layer/types.py` — Data/Model
- `semantic_layer/vectortypes.py` — Data/Model

## Utils

- `utils/__tests__/browserStorage.test.ts` — Testing
- `utils/__tests__/dateUtils.test.ts` — Testing
- `utils/__tests__/getDeadlineInfo.test.ts` — Testing
- `utils/__tests__/parseCSV.test.ts` — Testing
- `utils/browserStorage.ts` — Persistence
- `utils/calendarExport.ts` — Data/Model
- `utils/dataMigration.ts` — Persistence
- `utils/dateUtils.ts` — Data/Model
- `utils/exportFields.ts` — Data/Model
- `utils/exportFormats.ts` — Data/Model
- `utils/formatters.ts` — Data/Model
- `utils/locationService.ts` — Data/Model
- `utils/searchIndex.ts` — Search/Index
- `utils/searchIndex.worker.ts` — Search/Index
- `utils/searchIndexWorker.ts` — Search/Index
- `utils/searchIndexWrapper.ts` — Search/Index

## Test Suites

- `tests/e2e/app-launch.spec.ts` — Testing
- `tests/e2e/command-palette.spec.ts` — Testing
- `tests/integration/module-linking.test.ts` — Testing
- `tests/test_semantic_fixes.py` — Testing
- `tests/test_semantic_layer.py` — Testing
- `tests/test_semantic_server.py` — Testing
- `tests/test_semantic_server_stress.py` — Testing
- `tests/test_semantic_stress.py` — Testing

## Ownership Routing

- UI-triggered persistence flow ownership: `components/*` → `hooks/*` → `utils/dataMigration.ts` + `utils/browserStorage.ts` (web) or `lib/desktopBridge.ts` + Tauri Rust commands (Tauri desktop).
- Command flow ownership: `components/CommandPalette.tsx` → `hooks/useAppCommands.ts` / `hooks/useCommandPalette.ts` → `contexts/CommandContext.tsx` → component handlers.
- Desktop file APIs: `hooks/useApplicationForm.ts` + `hooks/useApplications.ts` → `lib/desktopBridge.ts` → Tauri Rust commands.
