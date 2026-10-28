# AcademiaTrack CLI tests

The `academiatrack` binary reads and writes the desktop `data.json` store. These tests call that binary. They never use the home data directory: every mutating command gets `--data-dir` pointed at a fresh temp directory, and the no-argument check passes a closed stdin so the REPL cannot start.

## Plan

Written before the run.

1. `agent_workflow_round_trip` — add MIT / EECS PhD with deadline 2030-06-01, confirm `documents.cv.required` is true, set status to Submitted, search, list upcoming deadlines, export CSV, undo back to Not Started, redo to Submitted, create a backup, delete the row, restore the backup, and get the row again.
2. `help_exits_zero_and_a_pipe_without_a_command_exits_two` — `--help` exits 0. No arguments and a non-terminal stdin exit 2 and do not open a REPL.
3. `future_schema_is_not_downgraded` — a loadable version 4 document refuses `application add` and stays byte-for-byte the same.
4. `legacy_array_migrates_on_write_and_keeps_the_old_row` — a version 0 array is migrated to version 3 on the next add, and the original row remains.
5. `unknown_root_and_application_keys_survive_update` — keys the CLI does not own survive `application update`.
6. `live_desktop_lock_blocks_and_a_dead_lock_is_recovered` (Unix) — a live foreign pid in `desktop.lock` refuses a write; a dead pid is removed and the write proceeds. The test records the sleep pid it spawned and kills only that pid.

Unit tests in `src/store.rs` and `src/cli.rs` cover corrupt backups, the 50 MB cap, `save_raw` writing no undo history, and the in-process parser. This file records the binary run.

## Results

Command, 2026-10-28:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --lib --bins --test cli_e2e -- --test-threads=8
```

Exit 0. Finished in 7.80s incremental (first full build 33.09s). No compiler warnings on the second run.

- `academia_track_lib` unit tests: 25 passed, 0 failed, 2.03s. Includes store schema, migration, undo, backup, lock, size cap, and CLI parser tests, plus the existing semantic sidecar tests.
- `academia-track` and `academiatrack` binary crates: 0 tests, both compiled.
- `cli_e2e`: 6 passed, 0 failed, 0.20s. `agent_workflow_round_trip`, `help_exits_zero_and_a_pipe_without_a_command_exits_two`, `future_schema_is_not_downgraded`, `legacy_array_migrates_on_write_and_keeps_the_old_row`, `unknown_root_and_application_keys_survive_update`, `live_desktop_lock_blocks_and_a_dead_lock_is_recovered`.

The e2e run printed temp paths under the system temp directory and deleted them. It did not pass `ACADEMIATRACK_DATA_DIR` and every mutating command used `--data-dir`.

## Results — form shape and document updates

Command, 2026-10-28, after import began filling the form shape and `application update` gained fee waiver, decision deadline, admission chance, and one document slot:

```bash
cargo test --manifest-path src-tauri/Cargo.toml --lib --bins --test cli_e2e -- --test-threads=8
```

Exit 0. Incremental compile 4.23s. The compiler printed no warnings.

- `academia_track_lib` unit tests: 28 passed, 0 failed, 2.07s. The three new cases are `import_partial_record_matches_the_ui_shape_and_rejects_a_duplicate_id`, `update_document_fee_waiver_and_decision_deadline`, and `update_sets_fee_waiver_chance_and_one_document`.
- Both binary crates compiled with 0 tests.
- `cli_e2e`: 6 passed, 0 failed, 0.21s. Same six cases as the first run.

The e2e run again used temp directories and `--data-dir`. It did not set `ACADEMIATRACK_DATA_DIR`.

Vitest, same day:

```bash
bun run test:run utils/__tests__/dataMigration.test.ts hooks/__tests__/useApplications.test.tsx
```

Exit 0. 2 files, 5 tests passed (`dataMigration` 3, `useApplications` 2).
