import { useEffect, useState } from 'react';

/**
 * The current time, re-read every `intervalMs` while `enabled`, so elapsed times and countdowns
 * tick without any request. Off, it is the time of the last tick — or of the first render.
 */
export function useNow(enabled: boolean, intervalMs: number = 1000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [enabled, intervalMs]);

  return now;
}
