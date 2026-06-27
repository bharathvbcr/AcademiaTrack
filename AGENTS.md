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

## GitNexus

This repo should also have a GitNexus index at `.gitnexus/`.

Rules:
- Use `npm run gitnexus:status` to check whether the GitNexus index exists and is fresh.
- Use `npm run gitnexus:analyze` to build or refresh `.gitnexus/`.
- Use `npm run map:status` before architecture or ownership work when you need both GitNexus freshness and static map coverage.
- Use `npm run map:refresh` after broad code changes to refresh GitNexus, check Graphify hook wiring, and verify static map coverage. If Graphify graph content is stale, run `/graphify . --update`.

Use the repository maps below for deterministic file discovery and ownership:

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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **AcademiaTrack** (2459 symbols, 3441 relationships, 61 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/AcademiaTrack/context` | Codebase overview, check index freshness |
| `gitnexus://repo/AcademiaTrack/clusters` | All functional areas |
| `gitnexus://repo/AcademiaTrack/processes` | All execution flows |
| `gitnexus://repo/AcademiaTrack/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
