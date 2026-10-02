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
- If graph state appears stale, rebuild with the `/graphify . --update` skill workflow. The installed `graphify` CLI in this environment supports graph queries and hook management, but not shell-based graph rebuilds.

## DevMap

This repo is indexed by DevMap. Its store is per-worktree state under `.devcouncil/` (gitignored); see "Navigate with DevMap and GitPulse Insights" below for how to query it.

Rules:
- Use `devmap status --json` from the repository root (or the `devmap_status` MCP tool) to check whether the DevMap index exists and is fresh.
- Use `devmap build --manifest` from the repository root to build or refresh it.
- Use `bun run map:status` before architecture or ownership work when you need both DevMap freshness and static map coverage.
- Use `bun run map:refresh` after broad code changes to rebuild DevMap, check Graphify hook wiring, and verify static map coverage. If Graphify graph content is stale, run `/graphify . --update`.

Use the repository maps below for deterministic file discovery and ownership:

- `CALL_CHAIN_PERSISTENCE.md` — user action → persistence path map.
- `COMMUNITY_MAP_SUBSYSTEM.md` — subsystem community map.
- `OWNERSHIP_INVENTORY.md` — file-by-file ownership index for all mapped files.
- `graphify-out/FILE_INDEX.md` — quick subsystem-to-file lookup.
- `graphify-out/GRAPH_REPORT.md` — canonical map report summary.
- `bun run map:verify` — checks ownership coverage against tracked files.

When resolving where to change code:

- Start from `COMMUNITY_MAP_SUBSYSTEM.md` to pick the owning subsystem.
- Use `OWNERSHIP_INVENTORY.md` for exact file ownership.
- Use `CALL_CHAIN_PERSISTENCE.md` to follow any user-action persistence chain.
- Run `bun run map:verify` after edits touching file ownership boundaries.
- Confirm placement with `graphify-out/GRAPH_REPORT.md` and `graphify-out/GRAPH_TREE.html` before finalizing.

<!-- agent-navigation:start -->
## Navigate with DevMap and GitPulse Insights

Ask these two before reading files. They answer different questions, neither substitutes for the other, and neither is `rg`.

**DevMap — where the code is and what it touches.** `devmap_search` to locate, `devmap_explore` for structure, `devmap_neighbors` and `devmap_impact` for callers and blast radius, `devmap_trace` for how two symbols connect, `devmap_affected_tests` for what to run, `devmap_dead_symbols` before deleting, `devmap_clones` before adding a near-copy, `devmap_preview` to ask what an unsaved edit would break. The `devmap` CLI answers the same questions when the MCP tools are not loaded. Pass `repo_path` (the absolute repository path) on every `devmap_*` call and check `repository.root` in the envelope. Read `truncated` and `walk_incomplete` before treating an empty list as "nothing exists" — on an unbuilt or degraded index every question answers "nothing", and `devmap_status` is what distinguishes the two. Generated state is per-worktree and is not copied by Git; if the store is missing, run `devmap build --manifest` from this worktree's root rather than copying a sibling's database.

**GitPulse Insights — who else is in this repository right now.** `gitpulse_insights` first: it names the other worktrees, the running agent sessions, uncommitted work, contended files and index health in one call. Then `gitpulse_collision_risk` before touching a file another worktree may hold, `gitpulse_active_changes` for what is in flight, `gitpulse_change_context` / `gitpulse_provenance` for what changed and why, and `gitpulse_ledger_events` for the recorded history. It is served over MCP only — there is no `gitpulse` CLI. Its facets fail independently: check each `ok`, because a facet that could not scan is not a facet that came back clean.

Navigating the graph perfectly and then editing a file a sibling lane is holding is still a collision, which is why both are named here.

This binds every agent working in this repository, not only the one reading this file. When you delegate — a subagent, a worktree lane, a handoff plan — name DevMap and GitPulse Insights in the prompt with the same precedence, rather than leaving that agent to grep its way in. When either tool cannot answer (truncated, `walk_incomplete`, empty on a built index, or a capability it does not have), record the gap and say so; do not silently fall back to grep and report the result as if the graph had confirmed it.
<!-- agent-navigation:end -->
