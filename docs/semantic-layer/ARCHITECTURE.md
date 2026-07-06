# Semantic Layer Architecture

Production-grade semantic optimization layer for AcademiaTrack's local LLM pipeline. Sits between the React frontend and Ollama (or other local backends) to reduce inference cost, VRAM pressure, and latency via **semantic caching**, **complexity routing**, and **RAG context compression**.

---

## System Architecture & Data Flow

### High-level placement

AcademiaTrack already integrates this layer as a **Python sidecar** (`semantic_layer/server.py`) called from the TypeScript client (`services/ai/semanticBridge.ts`) and unified chat entrypoint (`services/ai/chat.ts`). When `semanticEnabled` is on and the sidecar is healthy, chat bypasses direct Ollama calls and flows through the semantic pipeline.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  AcademiaTrack Frontend                                                     │
│  AIAssistantModal / DashboardAIBriefing / useAI                             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │ chatWithSemanticLayer()
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  services/ai/semanticBridge.ts                                              │
│  POST /v1/chat  or  /v1/chat/stream  →  http://127.0.0.1:8765             │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  semantic_layer/server.py (Starlette sidecar, SEMANTIC_ENABLED=1)           │
│  npm run semantic:serve                                                     │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  SemanticPipeline (semantic_layer/pipeline.py → orchestrator.py)            │
│                                                                             │
│   ┌──────────────┐   miss    ┌──────────────┐   ┌─────────────────────┐   │
│   │ 1. Embed     │──────────▶│ 2. Cache     │──▶│ 3. Router           │   │
│   │ MiniLM-L6-v2 │           │ FAISS/Chroma │   │ ComplexityRouter    │   │
│   └──────────────┘           └──────┬───────┘   └──────────┬──────────┘   │
│                                     │ hit                   │               │
│                                     │ (return cached)       ▼               │
│                                     │              ┌─────────────────────┐  │
│                                     │              │ 4. Compressor (RAG) │  │
│                                     │              │ MMR chunk filter    │  │
│                                     │              └──────────┬──────────┘  │
│                                     │                         ▼             │
│                                     │              ┌─────────────────────┐  │
│                                     │              │ 5. LLM Backend      │  │
│                                     │              │ Ollama / mock       │  │
│                                     │              └──────────┬──────────┘  │
│                                     │                         │             │
│                                     │              async write-back on miss │
│                                     └─────────────────────────────────────────│
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  Ollama (localhost:11434) — llama3.2:1b (small) or llama3.1:8b (large)      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Per-request flow (detailed)

```
User prompt
    │
    ├─▶ EmbeddingService.encode_one()          ~3–8 ms (CPU, warm)
    │
    ├─▶ SemanticCache.lookup(query_vec)        ~1–3 ms (FAISS, 10k entries)
    │       │
    │       ├─ HIT  (sim ≥ τ AND margin ≥ m)  → return cached response  [DONE]
    │       └─ MISS (below τ / ambiguous / OOD / expired)
    │
    ├─▶ ComplexityRouter.route()               ~0.1–0.5 ms
    │       heuristic + embedding centroid score → small (1B–3B) or large (8B–70B)
    │
    ├─▶ RagSemanticCompressor.compress()     ~2–10 ms (if RAG chunks present)
    │       cosine filter + MMR + token budget cap
    │
    ├─▶ LLMBackend.generate(model_id, prompt)  (dominant cost — skipped on cache hit)
    │
    └─▶ async cache.store() on miss            (non-blocking write-back)
```

**Graceful fallthrough:** If the sidecar is down, `chatWithSemanticLayer` catches errors and falls back to direct provider inference. Semantic failures never block the user.

### Module map

| Spec module | Implementation | Responsibility |
|-------------|----------------|----------------|
| `cache.py` | `semantic_layer/cache/` | FAISS/Chroma semantic cache, TTL+LRU |
| `router.py` | `semantic_layer/router/` | Complexity-based model routing |
| `compressor.py` | `semantic_layer/compressor/` | RAG chunk filtering (MMR) |
| `pipeline.py` | `semantic_layer/pipeline.py` | End-to-end orchestrator |
| `threshold.py` | `semantic_layer/threshold.py` | Auto-tuning worker |
| `types.py` | `semantic_layer/types.py` | Shared dataclasses & protocols |
| Config | `semantic_layer/config.py` | Pydantic settings (`SEMANTIC_*` env) |
| Embeddings | `semantic_layer/embeddings.py` | MiniLM encoder singleton |
| Metrics | `semantic_layer/metrics.py` | Latency / hit-rate telemetry |
| Sidecar | `semantic_layer/server.py` | HTTP bridge for TS client |

> **Note:** `cache`, `router`, and `compressor` are Python packages (not flat `.py` files) to support multiple backends without import conflicts.

---

## Mathematical Optimization & Thresholding Logic

### Cosine similarity (cache lookup)

Embeddings are L2-normalized so **dot product equals cosine similarity**:

\[
\text{sim}(q, k) = \frac{q \cdot k}{\|q\| \|k\|} = q \cdot k \quad \text{(when normalized)}
\]

A cache **hit** requires both:

1. **Threshold:** \(\text{sim}_1 \geq \tau\) (default \(\tau = 0.90\))
2. **Margin guard:** \(\text{sim}_1 - \text{sim}_2 \geq m\) (default \(m = 0.04\))

The margin prevents false positives when two cached prompts are near-duplicates in embedding space.

### Out-of-distribution (OOD) gating

Optional domain centroid \(c\) rejects queries far from the training domain:

\[
\text{sim}(q, c) < \tau_{\text{ood}} \Rightarrow \text{force miss} \quad (\tau_{\text{ood}} = 0.75)
\]

### Router complexity score

Hybrid score in \([0, 1]\):

\[
C = 0.4 \cdot h(\text{prompt}) + 0.6 \cdot \sigma_{\text{softmax}}(\text{sim}(q, c_{\text{complex}}), \text{sim}(q, c_{\text{simple}}))
\]

Route to **LARGE** if \(C \geq \tau_r\) (default 0.55), else **SMALL**.

### RAG compression (MMR)

For chunk \(i\) with relevance \(r_i = q \cdot k_i\):

\[
\text{MMR}(i) = \lambda \cdot r_i - (1 - \lambda) \cdot \max_{j \in S} (k_i \cdot k_j)
\]

Default \(\lambda = 0.7\). Chunks below `min_chunk_relevance` (0.35) are dropped. Selection stops at `max_rag_chunks` (8) or `max_context_tokens` (2048).

### Threshold auto-tuning pseudocode

Background daemon (`ThresholdAutoTuner`) runs every 300s on a sliding window of feedback records `(similarity, accepted)`:

```
function TUNE(records[], current_τ):
    if len(records) < MIN_SAMPLES: return current_τ

    best_τ ← current_τ
    best_score ← -∞

    for τ in range(TAU_MIN, TAU_MAX, TAU_STEP):
        hits ← [r for r in records if r.similarity ≥ τ]
        if len(hits) < MIN_HITS: continue

        fp_rate ← count(h for h in hits if not h.accepted) / len(hits)
        if fp_rate > MAX_FP_RATE: continue   # default 2%

        hit_rate ← len(hits) / len(records)
        score ← hit_rate × 500 − fp_rate × 2000

        if score > best_score:
            best_score ← score
            best_τ ← τ

    smoothed ← (1 − α) × current_τ + α × best_τ    # α = 0.10
    cache.update_threshold(clamp(smoothed, 0.82, 0.975))
    return smoothed
```

User feedback arrives via `POST /v1/feedback` or `pipeline.record_feedback(similarity, accepted)`.

### False-positive prevention checklist

| Mechanism | Purpose |
|-----------|---------|
| High default τ (0.90) | Conservative hit bar |
| Margin guard (0.04) | Disambiguate near neighbors |
| OOD gating | Reject off-domain paraphrases |
| FP-rate cap in tuner | Auto-raise τ when users reject hits |
| Model version tag | Invalidate cross-model cache entries (Chroma backend) |

---

## Resource Management & Benchmarking Strategy

### Targets

| Resource | Target | Rationale |
|----------|--------|-----------|
| Semantic overhead (p95) | **< 15 ms** | Excludes LLM inference; SLO in config |
| Embedding RAM | ~80 MB | MiniLM-L6-v2 on CPU |
| FAISS index (10k × 384) | ~15 MB | Float32 vectors |
| Total cache RAM budget | 512 MB (configurable) | `cache_max_ram_mb` |
| VRAM savings | Skip LLM on cache hit | Full model unload possible between hits |
| Small model VRAM | ~1–2 GB | 1B–3B via Ollama |
| Large model VRAM | ~5–8 GB | 8B quantized |

### Cache invalidation

| Strategy | Implementation |
|----------|----------------|
| **TTL (hard)** | `cache_ttl_seconds` = 86400 (24h); entry marked expired, evicted on access |
| **Soft TTL** | `cache_soft_ttl_seconds` = 3600 — reserved for future stale-while-revalidate |
| **LRU** | On `max_entries` (10k), evict lowest `last_accessed_at` |
| **Tombstone rebuild** | FAISS lacks row delete; rebuild when tombstone ratio > 10% |
| **Model version** | Entries tagged; Chroma backend filters by `model_version` |
| **Threshold raise** | Auto-tuner increases τ when FP rate exceeds 2% |

### Edge cases

| Scenario | Behavior |
|----------|----------|
| **Cold start** | First embed ~200–500ms (model load). Call `pipeline.initialize()` at sidecar boot. |
| **OOD query** | Force miss; route to LLM normally |
| **Ambiguous neighbors** | Margin guard → miss; avoids wrong cached answer |
| **Resource contention** | Embeddings on CPU by default; LLM retains GPU. Configurable `embedding_device`. |
| **Sidecar down** | TS client falls back to direct Ollama (`chat.ts`) |
| **Empty RAG** | Compressor skipped; zero overhead |
| **Router failure** | Fail-open to LARGE model (configurable) |

### Benchmarking

Run the included benchmark harness:

```bash
# Mock embeddings (CI-friendly, no download)
python -m semantic_layer.benchmarks.latency_benchmark --iterations 200

# Production profile with real MiniLM
python -m semantic_layer.benchmarks.latency_benchmark --iterations 200 --real-embedder
```

Metrics exported via `SemanticMetrics.get_snapshot()` and optional Prometheus (`SEMANTIC_ENABLE_PROMETHEUS=1`).

Unit tests: `npm run semantic:test` or `pytest tests/test_semantic_layer.py`.

---

## Integration Points (AcademiaTrack)

| Layer | File | Role |
|-------|------|------|
| UI | `components/AIAssistantModal.tsx` | Chat modal; receives semantic meta via `onMeta` |
| UI | `components/DashboardAIBriefing.tsx` | Dashboard AI briefing |
| Hook | `hooks/useAI.ts` | AI settings and provider wiring |
| Chat | `services/ai/chat.ts` | `chatWithSemanticLayer()` entrypoint |
| Bridge | `services/ai/semanticBridge.ts` | HTTP client for sidecar |
| Prompts | `services/ai/prompts.ts` | System prompts (unchanged by semantic layer) |
| Sidecar | `semantic_layer/server.py` | `/health`, `/v1/chat`, `/v1/chat/stream`, `/v1/feedback` |
| Config | `semantic_layer/config.py` | `server_port=8765` matches `DEFAULT_SEMANTIC_BASE_URL` |
| NPM | `package.json` | `semantic:serve`, `semantic:test` scripts |

### Environment variables

```bash
SEMANTIC_ENABLED=1                          # Enable sidecar
SEMANTIC_SIMILARITY_THRESHOLD=0.90
SEMANTIC_SMALL_MODEL_ID=llama3.2:1b
SEMANTIC_LARGE_MODEL_ID=llama3.1:8b
SEMANTIC_EMBEDDING_DEVICE=cpu
VITE_SEMANTIC_ENABLED=1                       # Frontend build-time default
```

### Deployment topology

```
┌─────────────┐     :5173      ┌──────────────┐     :8765      ┌─────────────┐
│ Vite/React  │ ──────────────▶│ semantic     │ ──────────────▶│ Ollama      │
│ AcademiaTrack│   fetch /chat  │ sidecar (Py) │  /api/generate│ :11434      │
└─────────────┘                └──────────────┘                └─────────────┘
     CPU                            CPU                           GPU/CPU
```

---

## Quick Start

```bash
# Create venv (repo includes .venv-semantic)
python -m venv .venv-semantic && source .venv-semantic/bin/activate
pip install -r semantic_layer/requirements.txt

# Run example (mock LLM, no Ollama)
python -m semantic_layer.examples.basic_pipeline

# Start sidecar for frontend integration
SEMANTIC_ENABLED=1 npm run semantic:serve
```

---

## Design Principles

1. **CPU-friendly semantic ops** — embeddings and FAISS on CPU; GPU reserved for LLM.
2. **Fail-open** — semantic layer never blocks inference.
3. **Conservative caching** — high τ + margin guard + FP-aware auto-tuning.
4. **Modular backends** — swap FAISS/Chroma, Ollama/mock via protocols.
5. **Observable** — per-stage latency breakdown in every `PipelineResult`.
