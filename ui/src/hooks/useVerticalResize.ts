import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "swift.taskFormHeight";

type UseVerticalResizeOptions = {
  defaultHeight: number;
  minHeight: number;
  maxHeight: number;
};

export function useVerticalResize({
  defaultHeight,
  minHeight,
  maxHeight,
}: UseVerticalResizeOptions) {
  const [height, setHeight] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed)) {
        return clamp(parsed, minHeight, maxHeight);
      }
    }
    return defaultHeight;
  });
  const dragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);

  const persist = useCallback(
    (next: number) => {
      const clamped = clamp(next, minHeight, maxHeight);
      setHeight(clamped);
      localStorage.setItem(STORAGE_KEY, String(clamped));
    },
    [minHeight, maxHeight],
  );

  const onResizePointerDown = useCallback(
    (event: React.PointerEvent) => {
      dragging.current = true;
      startY.current = event.clientY;
      startHeight.current = height;
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [height],
  );

  const onResizePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragging.current) {
        return;
      }
      const delta = startY.current - event.clientY;
      persist(startHeight.current + delta);
    },
    [persist],
  );

  const onResizePointerUp = useCallback((event: React.PointerEvent) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return {
    height,
    setHeight: persist,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function useMaxPaneHeight(ratio = 0.55) {
  const [maxHeight, setMaxHeight] = useState(480);

  useEffect(() => {
    const update = () => {
      setMaxHeight(Math.max(200, Math.floor(window.innerHeight * ratio)));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [ratio]);

  return maxHeight;
}
