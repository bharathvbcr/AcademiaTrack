import { useCallback, useEffect, useRef, useState } from 'react';
import { AISettings } from '../services/ai';
import {
    buildSemanticRuntimeStatus,
    invokeStartSemanticSidecar,
    invokeStopSemanticSidecar,
    refreshSemanticRuntimeStatus,
    SemanticRuntimeStatus,
    shouldManageSemanticSidecar,
} from '../services/ai/semanticSidecar';
import { resolveSemanticEnabled } from '../services/ai/semanticBridge';

const POLL_MS = 4000;

const IDLE_STATUS: SemanticRuntimeStatus = {
    desired: false,
    health: null,
    sidecar: null,
    ready: false,
    label: 'Off',
};

/**
 * Keeps the Tauri-managed semantic sidecar aligned with AI settings and exposes
 * live readiness for the settings UI and chat routing.
 */
export function useSemanticSidecar(settings: AISettings) {
    const [status, setStatus] = useState<SemanticRuntimeStatus>(IDLE_STATUS);
    const requestIdRef = useRef(0);

    const refresh = useCallback(async () => {
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        const next = await refreshSemanticRuntimeStatus(settings).catch(() =>
            buildSemanticRuntimeStatus(settings, null, null),
        );
        if (requestIdRef.current === requestId) {
            setStatus(next);
        }
        return next;
    }, [settings]);

    useEffect(() => {
        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | undefined;

        const sync = async () => {
            const manage = shouldManageSemanticSidecar(settings);
            if (!manage) {
                await invokeStopSemanticSidecar().catch(() => null);
                if (resolveSemanticEnabled(settings)) {
                    const next = await refreshSemanticRuntimeStatus(settings).catch(() =>
                        buildSemanticRuntimeStatus(settings, null, null),
                    );
                    if (!cancelled) setStatus(next);
                } else if (!cancelled) {
                    setStatus(buildSemanticRuntimeStatus(settings, null, null));
                }
                return;
            }

            await invokeStartSemanticSidecar(settings).catch(() => null);
            const next = await refreshSemanticRuntimeStatus(settings).catch(() =>
                buildSemanticRuntimeStatus(settings, null, null),
            );
            if (!cancelled) {
                setStatus(next);
            }
        };

        void sync();
        interval = setInterval(() => {
            void refreshSemanticRuntimeStatus(settings)
                .then((next) => {
                    if (!cancelled) setStatus(next);
                })
                .catch(() => {});
        }, POLL_MS);

        return () => {
            cancelled = true;
            if (interval) clearInterval(interval);
        };
    }, [
        settings.enabled,
        settings.provider,
        settings.semanticEnabled,
        settings.semanticBaseUrl,
    ]);

    return { semanticStatus: status, refreshSemanticStatus: refresh };
}

export type UseSemanticSidecarReturn = ReturnType<typeof useSemanticSidecar>;
