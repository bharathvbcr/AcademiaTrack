/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Set to "0" to disable semantic routing by default (overridable in Settings → AI). */
    readonly VITE_SEMANTIC_ENABLED?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
