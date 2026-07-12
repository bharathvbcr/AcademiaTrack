import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Application, ApplicationStatus } from '../types';

function celebrateAcceptance() {
  const end = Date.now() + 3_000;
  const colors = ['#FFD700', '#FFA500', '#FF8C00'];
  let frameId: number | null = null;

  const frame = () => {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });
    if (Date.now() < end) {
      frameId = requestAnimationFrame(frame);
    }
  };
  frame();

  const burstTimeout = setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#bb0000', '#ffffff'],
    });
  }, 500);

  return () => {
    if (frameId !== null) cancelAnimationFrame(frameId);
    clearTimeout(burstTimeout);
  };
}

/**
 * Fires a celebration when any application's status transitions to Accepted.
 * Salvaged from the unused ApplicationCard component.
 */
export function useAcceptanceConfetti(applications: Application[]) {
  const prevStatusesRef = useRef<Map<string, ApplicationStatus>>(new Map());
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const prev = prevStatusesRef.current;
    let shouldCelebrate = false;

    for (const app of applications) {
      const prior = prev.get(app.id);
      if (
        prior !== undefined &&
        prior !== ApplicationStatus.Accepted &&
        app.status === ApplicationStatus.Accepted
      ) {
        shouldCelebrate = true;
      }
    }

    const next = new Map<string, ApplicationStatus>();
    for (const app of applications) {
      next.set(app.id, app.status);
    }
    prevStatusesRef.current = next;

    if (shouldCelebrate) {
      cleanupRef.current?.();
      cleanupRef.current = celebrateAcceptance();
    }
  }, [applications]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);
}
