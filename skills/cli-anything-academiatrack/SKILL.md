---
name: cli-anything-academiatrack
description: Drive AcademiaTrack from the academiatrack CLI. Use when an agent needs to list, add, update, search, import, export, back up, or undo desktop applications without opening the GUI.
---

# AcademiaTrack CLI

`academiatrack` reads and writes the desktop `data.json` file. It is the same store the Tauri app saves. It does not read or write the browser `localStorage` key `phd-applications`.

From the repo:

```bash
bun run cli -- --json status
```

That runs `cargo run --manifest-path src-tauri/Cargo.toml --bin academiatrack`. A built binary is `academiatrack` (the desktop app binary is `academia-track`).

## Before you write

Close AcademiaTrack first. The open window keeps applications in memory and overwrites `data.json` on the next edit. The running desktop app writes `desktop.lock`. A mutation then fails and names the pid. Reads still work. `status` reports `desktop_running` and `writable`.

A desktop build from before this CLI does not write `desktop.lock`. If that window is already open, the CLI cannot see it, and the window can still overwrite a CLI edit.

On Windows a `desktop.lock` whose pid cannot be checked blocks writes until the file is removed.

## Output

Pass `--json` on every agent call. Success and failure are one JSON object on stdout:

```json
{"ok":true,"command":"application.add","data":{}}
{"ok":false,"command":"application.add","error":"..."}
```

Exit 0 is success, 1 is an operational failure, 2 is usage. Do not retry a failed command until you have read `error`. If stderr says undo history was not recorded, the data file was still saved.

`--data-dir DIR` selects the data directory. Otherwise the CLI uses `ACADEMIATRACK_DATA_DIR`, then the platform app-data directory for `com.bharathvbcr.academiatrack`.

With no command, a terminal opens a REPL. A pipe with no command exits 2.

## Commands

- `status`
- `application list [--status S] [--limit N]`
- `application get ID`
- `application add --university NAME --program NAME [--id ID] [--department T] [--location T] [--program-type phd|masters|bachelors|postdoc|other] [--status S] [--deadline YYYY-MM-DD] [--portal URL] [--notes T] [--fee N] [--term fall|spring|summer] [--year YYYY] [--tag T]`
- `application update ID` with the same fields, plus `--deadline none`, `--term none`, `--year none`, `--pinned true|false`, `--tag`, `--untag`, `--fee-waiver not-requested|requested|granted|denied`, `--decision-deadline YYYY-MM-DD|none`, `--chance N|none`, `--document cv|sop|transcripts|lor1|lor2|lor3|writing-sample` with `--document-status` and/or `--document-required true|false`
- `application delete ID` — deletes every row with that id and returns the count. Missing ids delete 0.
- `application search QUERY` — case-insensitive substring, not a regex.
- `deadline upcoming [--days N]` — default 14. Skips Accepted, Rejected, Withdrawn, Skipping, Attending.
- `deadline overdue`
- `export json|csv [-o PATH]` — CSV is a fixed column set. The in-app export modal remains the full field picker. Cells that start with `=`, `+`, `-`, `@`, tab, or CR are prefixed with a quote.
- `import PATH [--merge]` — a schema object, an array, or one application. Replace is the default. The first invalid record fails the whole import. A missing status, program type, fee, fee waiver, document slot, financial offer, or test record is filled to the form shape. Unknown keys are kept. A duplicate id, or a status or program type the app does not recognize, fails the whole import and writes nothing.
- `backup create|list|restore FILENAME|delete FILENAME` — `restore` takes a filename, not a path.
- `undo` / `redo` — CLI writes only. Refuses when `data.json` changed after the command.

`add` always creates a row. A duplicate `--id` is an error. `update` errors when the id matches more than one row and writes nothing.

Schema version stays 3, the same constant as `utils/dataMigration.ts`. A newer loadable file can be read and must not be written. The CLI does not wipe an unversioned object that already has an `applications` array.

## Example

```bash
bun run cli -- --json --data-dir /tmp/at-demo application add \
  --university MIT --program "EECS PhD" --deadline 2030-06-01
bun run cli -- --json --data-dir /tmp/at-demo application update ID --status submitted
bun run cli -- --json --data-dir /tmp/at-demo application search eecs
bun run cli -- --json --data-dir /tmp/at-demo undo
```

Tests: `cargo test --manifest-path src-tauri/Cargo.toml --lib --bins --test cli_e2e`. See `src-tauri/tests/TEST.md`.
