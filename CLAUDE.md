<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **AcademiaTrack** (2740 symbols, 5504 relationships, 221 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

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

<!-- agent-navigation:start -->
## Navigate with DevMap and GitPulse Insights

Ask these two before reading files. They answer different questions, neither substitutes for the other, and neither is `rg`.

**DevMap — where the code is and what it touches.** `devmap_search` to locate, `devmap_explore` for structure, `devmap_neighbors` and `devmap_impact` for callers and blast radius, `devmap_trace` for how two symbols connect, `devmap_affected_tests` for what to run, `devmap_dead_symbols` before deleting, `devmap_clones` before adding a near-copy, `devmap_preview` to ask what an unsaved edit would break. The `devmap` CLI answers the same questions when the MCP tools are not loaded. Pass `repo_path` (the absolute repository path) on every `devmap_*` call and check `repository.root` in the envelope. Read `truncated` and `walk_incomplete` before treating an empty list as "nothing exists" — on an unbuilt or degraded index every question answers "nothing", and `devmap_status` is what distinguishes the two. Generated state is per-worktree and is not copied by Git; if the store is missing, run `devmap build --manifest` from this worktree's root rather than copying a sibling's database.

**GitPulse Insights — who else is in this repository right now.** `gitpulse_insights` first: it names the other worktrees, the running agent sessions, uncommitted work, contended files and index health in one call. Then `gitpulse_collision_risk` before touching a file another worktree may hold, `gitpulse_active_changes` for what is in flight, `gitpulse_change_context` / `gitpulse_provenance` for what changed and why, and `gitpulse_ledger_events` for the recorded history. It is served over MCP only — there is no `gitpulse` CLI. Its facets fail independently: check each `ok`, because a facet that could not scan is not a facet that came back clean.

Navigating the graph perfectly and then editing a file a sibling lane is holding is still a collision, which is why both are named here.

This binds every agent working in this repository, not only the one reading this file. When you delegate — a subagent, a worktree lane, a handoff plan — name DevMap and GitPulse Insights in the prompt with the same precedence, rather than leaving that agent to grep its way in. When either tool cannot answer (truncated, `walk_incomplete`, empty on a built index, or a capability it does not have), record the gap and say so; do not silently fall back to grep and report the result as if the graph had confirmed it.
<!-- agent-navigation:end -->
