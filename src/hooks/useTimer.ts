import { useEffect, useRef, useCallback } from 'react';
import { useExamStore } from '../store/examStore';

/**
 * Timer hook that manages countdown, persists across refresh,
 * and auto-submits when time expires.
 */
export function useTimer() {
  const { examState, updateTimer } = useExamStore();
  const intervalRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(Date.now());

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!examState || examState.status !== 'running') {
      clearTimer();
      return;
    }

    // Study mode has no timer
    if (!examState.endTime) {
      return;
    }

    // Calculate remaining from endTime (survives refresh)
    const endTime = new Date(examState.endTime).getTime();

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      updateTimer(remaining);

      if (remaining <= 0) {
        clearTimer();
      }
    };

    // Immediate tick
    tick();

    // Start interval
    lastTickRef.current = Date.now();
    intervalRef.current = window.setInterval(tick, 1000);

    return clearTimer;
  }, [examState?.status, examState?.endTime]);

  // Warning thresholds
  const remaining = examState?.remainingSeconds ?? Infinity;
  const showWarning5min = remaining <= 300 && remaining > 60;
  const showWarning1min = remaining <= 60 && remaining > 0;
  const isExpired = remaining <= 0;

  return {
    remainingSeconds: remaining,
    showWarning5min,
    showWarning1min,
    isExpired,
  };
}
