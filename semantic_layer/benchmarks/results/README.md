# Semantic layer latency — measured results

Run:

```bash
python -m semantic_layer.benchmarks.latency_benchmark --iterations 500 \
    --json-out semantic_layer/benchmarks/results/mock_500.json
python -m semantic_layer.benchmarks.latency_benchmark --iterations 500 --real-embedder \
    --json-out semantic_layer/benchmarks/results/real_minilm_500.json
```

Hardware: Apple silicon (macOS 27.0, arm64), Python 3.12.13, CPU only.
Embedder for the real run: `sentence-transformers/all-MiniLM-L6-v2`.
Pinned deps per `semantic_layer/requirements.txt`. 500 iterations per phase.

## Results

| Metric | Mock embedder | Real MiniLM | SLO |
|---|---|---|---|
| `semantic_p50_ms` | 0.169 | **11.284** | — |
| `semantic_p95_ms` | 0.782 | **185.722** | ≤ 15 |
| `semantic_p99_ms` | 1.141 | 231.208 | — |
| `replay_hit_p50_ms` | 0.078 | 8.950 | — |
| `replay_hit_p95_ms` | 0.141 | 19.722 | — |
| `replay_hit_rate` | 100.0% | 71.6% | — |
| `lookup_only_p95_ms` | 0.122 | 0.132 | — |
| `slo_pass` | PASS | **FAIL** | — |

**Run-to-run variance is large in the tail and these are single runs.** Two
runs of the identical real-embedder configuration produced p95 of 139.1 ms and
185.7 ms — a 34% spread. The p50, the hit rate, and `lookup_only_p95_ms` are
stable across runs; the p95 and p99 are not. Treat the tail figures as an
order of magnitude, not a measurement, until this is run with repeats and
intervals. The SLO verdict does not change either way: both runs fail by
roughly an order of magnitude.

## What these say, and what they do not

**The layer does not meet its own p95 SLO under a real embedder.** p50 is
11.3 ms and inside the 15 ms budget; p95 is 186 ms, roughly 12× over. The gap
is embedding cost on CPU, not the cache: `lookup_only_p95_ms` is 0.132 ms, so
FAISS lookup is ~0.07% of the p95 figure. Any quotable number here is the p50
or the isolated lookup — the end-to-end p95 is a failure and is recorded as one.

**The 71.6% replay hit rate is the ambiguity guard, not a miss.** The hit phase
replays seeded prompts verbatim, so similarity is ~1.0 and every query should
clear the 0.85 threshold. It does not, because `FaissSemanticCache` is
constructed with `margin=0.02`: when the top two neighbours are within that
margin the cache declines rather than guessing. The seed corpus is 1,000
strings differing only by an integer (`seed prompt 1` … `seed prompt 999`),
which is close to a worst case for that rule. Read 71.6% as the guard firing on
a deliberately adversarial corpus, not as a 28% cache failure.

**`cache_hit_p95_ms` is 0.000 in both runs and that is expected.** It reports on
the main loop, whose queries are unrelated to the seeded prompts by
construction. The `replay_hit_*` rows are the hit-path measurement. The 0.000
is retained rather than removed so the two phases stay distinguishable.

## Two defects this run exposed

Both were found while producing these numbers, and both are fixed in
`latency_benchmark.py`:

1. **`_seed_cache` ignored the embedder.** It always stored
   `_deterministic_vector()` mock vectors, even under `--real-embedder`. That
   put the cache in a different vector space than the queries, so nothing could
   ever clear the threshold: the real-embedder profile reported a **0% hit
   rate** and timed a miss path against a cache that was structurally incapable
   of hitting. Every real-embedder number this benchmark produced before this
   commit measured that broken configuration.

2. **The hit path was never exercised.** The cache was seeded with
   `seed prompt {i}` and queried with `benchmark query iteration {i}` — no
   shared wording, so `cache_hit_p95_ms` was always 0.000, printed in the same
   shape as a measured millisecond value. A zero that means "never ran" and a
   zero that means "instant" were indistinguishable in the report.

## Not measured

Concurrency (single-threaded throughout), cold-start and model-load cost
(`warm_up()` runs before timing), Chroma backend (FAISS only), memory
footprint, and GPU/MPS execution. Numbers are single-run, not averaged across
repeats, and carry no confidence intervals.
