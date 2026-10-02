<!-- agent-navigation:start -->
## Navigate with DevMap and GitPulse Insights

Ask these two before reading files. They answer different questions, neither substitutes for the other, and neither is `rg`.

**DevMap — where the code is and what it touches.** `devmap_search` to locate, `devmap_explore` for structure, `devmap_neighbors` and `devmap_impact` for callers and blast radius, `devmap_trace` for how two symbols connect, `devmap_affected_tests` for what to run, `devmap_dead_symbols` before deleting, `devmap_clones` before adding a near-copy, `devmap_preview` to ask what an unsaved edit would break. The `devmap` CLI answers the same questions when the MCP tools are not loaded. Pass `repo_path` (the absolute repository path) on every `devmap_*` call and check `repository.root` in the envelope. Read `truncated` and `walk_incomplete` before treating an empty list as "nothing exists" — on an unbuilt or degraded index every question answers "nothing", and `devmap_status` is what distinguishes the two. Generated state is per-worktree and is not copied by Git; if the store is missing, run `devmap build --manifest` from this worktree's root rather than copying a sibling's database.

**GitPulse Insights — who else is in this repository right now.** `gitpulse_insights` first: it names the other worktrees, the running agent sessions, uncommitted work, contended files and index health in one call. Then `gitpulse_collision_risk` before touching a file another worktree may hold, `gitpulse_active_changes` for what is in flight, `gitpulse_change_context` / `gitpulse_provenance` for what changed and why, and `gitpulse_ledger_events` for the recorded history. It is served over MCP only — there is no `gitpulse` CLI. Its facets fail independently: check each `ok`, because a facet that could not scan is not a facet that came back clean.

Navigating the graph perfectly and then editing a file a sibling lane is holding is still a collision, which is why both are named here.

This binds every agent working in this repository, not only the one reading this file. When you delegate — a subagent, a worktree lane, a handoff plan — name DevMap and GitPulse Insights in the prompt with the same precedence, rather than leaving that agent to grep its way in. When either tool cannot answer (truncated, `walk_incomplete`, empty on a built index, or a capability it does not have), record the gap and say so; do not silently fall back to grep and report the result as if the graph had confirmed it.
<!-- agent-navigation:end -->
