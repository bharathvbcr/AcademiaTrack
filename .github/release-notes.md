## Patch Notes

## [5.7.0] - 2026-08-21

### Added
- **Local Semantic Layer Sidecar:** Integrated a lightweight Python semantic sidecar for Ollama chat acceleration with intelligent complexity routing, vector caching (Chroma / FAISS), and RAG context compression.
- **Tauri Sidecar Process Management:** Added native sidecar lifecycle management and health probing inside the desktop application shell.
- **Local CI Automation:** Added `npm run ci:local` runner chaining version consistency checks, typechecking, test suites, map coverage, and production asset build.
- **Social Preview Metadata:** Added Open Graph and Twitter Card metadata tags along with a branded social preview banner for web and preview distributions.

### Fixed
- **AI Abort Signal Propagation:** Hardened `useAI` generation abort handling to isolate caller session cancellations from background status probing.

[Full changelog](https://github.com/bharathvbcr/AcademiaTrack/blob/main/CHANGELOG.md)
