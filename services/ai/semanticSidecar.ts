/**
 * Desktop integration for the Python semantic sidecar (Tauri auto-start + status).
 */
import { invoke } from '@tauri-apps/api/core';
import { isTauriRuntime } from '../../lib/desktopBridge';
import { AISettings } from './types';
import {
    DEFAULT_SEMANTIC_BASE_URL,
    probeSemanticHealth,
    resolveSemanticBaseUrl,
    resolveSemanticEnabled,
    SemanticHealthResponse,
    setSemanticAuthToken,
} from './semanticBridge';

export type SemanticSidecarPhase =
    | 'stopped'
    | 'starting'
    | 'running'
    | 'external'
    | 'failed';

export interface SemanticSidecarStatus {
    phase: SemanticSidecarPhase;
    port: number;
    spawnedByApp: boolean;
    pid?: number | null;
    error?: string | null;
    healthEnabled: boolean;
    healthReady: boolean;
    /** Secret for a sidecar this app started; absent for an external one. */
    authToken?: string | null;
}

export interface SemanticRuntimeStatus {
    /** User wants semantic routing (settings + Ollama). */
    desired: boolean;
    /** Sidecar HTTP health when probed. */
    health: SemanticHealthResponse | null;
    /** Tauri-managed process status (desktop only). */
    sidecar: SemanticSidecarStatus | null;
    /** True when chat can use the semantic layer right now. */
    ready: boolean;
    /** Human-readable status line for settings UI. */
    label: string;
}

interface RawSidecarStatus {
    phase: string;
    port: number;
    spawned_by_app: boolean;
    pid?: number | null;
    error?: string | null;
    health_enabled: boolean;
    health_ready: boolean;
    auth_token?: string | null;
}

function parsePortFromBaseUrl(baseUrl: string): number | undefined {
    try {
        const port = new URL(baseUrl).port;
        if (!port) return undefined;
        const parsed = Number(port);
        return Number.isFinite(parsed) ? parsed : undefined;
    } catch {
        return undefined;
    }
}

function normalizeSidecarStatus(raw: RawSidecarStatus): SemanticSidecarStatus {
    const phase = raw.phase as SemanticSidecarPhase;
    // Single funnel for every status the launcher returns -- start, stop and
    // poll all pass through here -- so the token the bridge sends is always the
    // one belonging to the process currently running. A stop clears it, and an
    // external sidecar reports none, which correctly leaves requests unsigned.
    setSemanticAuthToken(raw.auth_token ?? null);
    return {
        phase: ['stopped', 'starting', 'running', 'external', 'failed'].includes(phase)
            ? phase
            : 'stopped',
        port: raw.port,
        spawnedByApp: raw.spawned_by_app,
        pid: raw.pid ?? null,
        error: raw.error ?? null,
        healthEnabled: raw.health_enabled,
        healthReady: raw.health_ready,
        authToken: raw.auth_token ?? null,
    };
}

export function shouldManageSemanticSidecar(settings: AISettings): boolean {
    return (
        isTauriRuntime() &&
        settings.enabled &&
        settings.provider === 'ollama' &&
        resolveSemanticEnabled(settings)
    );
}

export function formatSemanticRuntimeLabel(status: SemanticRuntimeStatus): string {
    if (!status.desired) return 'Off';
    if (status.ready) {
        if (status.sidecar?.spawnedByApp) return 'Ready · started by app';
        if (status.sidecar?.phase === 'external') return 'Ready · external sidecar';
        return 'Ready';
    }
    if (status.sidecar?.phase === 'starting') return 'Starting sidecar…';
    if (status.sidecar?.error) return status.sidecar.error;
    if (status.health && !status.health.enabled) return 'Sidecar disabled';
    return 'Unavailable · using direct Ollama';
}

export function buildSemanticRuntimeStatus(
    settings: AISettings,
    health: SemanticHealthResponse | null,
    sidecar: SemanticSidecarStatus | null,
): SemanticRuntimeStatus {
    const desired = shouldManageSemanticSidecar(settings) || resolveSemanticEnabled(settings);
    const ready = Boolean(health?.enabled && health?.ready);
    const status: SemanticRuntimeStatus = {
        desired,
        health,
        sidecar,
        ready,
        label: '',
    };
    status.label = formatSemanticRuntimeLabel(status);
    return status;
}

export async function invokeStartSemanticSidecar(
    settings: AISettings,
): Promise<SemanticSidecarStatus | null> {
    if (!isTauriRuntime()) return null;
    const baseUrl = resolveSemanticBaseUrl(settings);
    const port = parsePortFromBaseUrl(baseUrl);
    const raw = await invoke<RawSidecarStatus>('start_semantic_sidecar', { port });
    return normalizeSidecarStatus(raw);
}

export async function invokeStopSemanticSidecar(): Promise<SemanticSidecarStatus | null> {
    if (!isTauriRuntime()) return null;
    const raw = await invoke<RawSidecarStatus>('stop_semantic_sidecar');
    return normalizeSidecarStatus(raw);
}

export async function invokeGetSemanticSidecarStatus(
    settings: AISettings,
): Promise<SemanticSidecarStatus | null> {
    if (!isTauriRuntime()) return null;
    const port = parsePortFromBaseUrl(resolveSemanticBaseUrl(settings));
    const raw = await invoke<RawSidecarStatus>('get_semantic_sidecar_status', { port });
    return normalizeSidecarStatus(raw);
}

export async function refreshSemanticRuntimeStatus(
    settings: AISettings,
    signal?: AbortSignal,
): Promise<SemanticRuntimeStatus> {
    const baseUrl = resolveSemanticBaseUrl(settings);
    const [health, sidecar] = await Promise.all([
        probeSemanticHealth(baseUrl, signal).catch(() => null),
        invokeGetSemanticSidecarStatus(settings).catch(() => null),
    ]);
    return buildSemanticRuntimeStatus(settings, health, sidecar);
}

export { DEFAULT_SEMANTIC_BASE_URL };
