import { useCallback, useRef } from "react";

export function useBatchedStream(onFlush: (delta: string) => void, intervalMs = 40) {
  const bufferRef = useRef("");
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }

    const buffered = bufferRef.current;
    if (!buffered) {
      return;
    }

    bufferRef.current = "";
    onFlush(buffered);
  }, [onFlush]);

  const push = useCallback(
    (delta: string) => {
      bufferRef.current += delta;
      if (!timerRef.current) {
        timerRef.current = setTimeout(flush, intervalMs);
      }
    },
    [flush, intervalMs]
  );

  const reset = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    bufferRef.current = "";
  }, []);

  return { push, flush, reset };
}
