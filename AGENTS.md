## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Canonical map artifacts:
  - `graphify-out/GRAPH_REPORT.md` for community structure, god nodes, and graph freshness
  - `graphify-out/FILE_INDEX.md` for a quick subsystem-to-file lookup
  - `graphify-out/GRAPH_TREE.html` for a collapsible file-tree view
  - `graphify-out/graph.html` for the interactive graph
  - `graphify-out/graph.json` for graph queries and path lookups
- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` first, then `graphify-out/FILE_INDEX.md`
- When you need to locate where something lives, prefer `graphify query "<question>"` (with graphify-out/graph.json) over grep
- If you need a visual file map, open `graphify-out/GRAPH_TREE.html`
- If graph state appears stale, rebuild with your repo-specific graphify workflow (artifact generation is already present under `graphify-out/` for reference)

## GitNexus Code Maps

Use the repository maps below for deterministic file discovery:

- `CALL_CHAIN_PERSISTENCE.md` — user action → persistence path map.
- `COMMUNITY_MAP_SUBSYSTEM.md` — subsystem community map.
- `OWNERSHIP_INVENTORY.md` — file-by-file ownership index for all mapped files.
- `graphify-out/FILE_INDEX.md` — quick subsystem-to-file lookup.
- `graphify-out/GRAPH_REPORT.md` — canonical map report summary.
- `npm run map:verify` — checks ownership coverage against tracked files.

When resolving where to change code:

- Start from `COMMUNITY_MAP_SUBSYSTEM.md` to pick the owning subsystem.
- Use `OWNERSHIP_INVENTORY.md` for exact file ownership.
- Use `CALL_CHAIN_PERSISTENCE.md` to follow any user-action persistence chain.
- Run `npm run map:verify` after edits touching file ownership boundaries.
- Confirm placement with `graphify-out/GRAPH_REPORT.md` and `graphify-out/GRAPH_TREE.html` before finalizing.
