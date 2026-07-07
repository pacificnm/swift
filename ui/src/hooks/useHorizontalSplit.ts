import { useCallback, useRef, type PointerEvent } from "react";

type UseHorizontalSplitOptions = {
  onResizeStart?: () => void;
  onResize: (percent: number) => void;
  getContainerWidth: () => number;
  getStartPercent: () => number;
};

export function useHorizontalSplit({
  onResizeStart,
  onResize,
  getContainerWidth,
  getStartPercent,
}: UseHorizontalSplitOptions) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const startPercent = useRef(0);

  const onDividerPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      dragging.current = true;
      startX.current = event.clientX;
      startPercent.current = getStartPercent();
      onResizeStart?.();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [getStartPercent, onResizeStart],
  );

  const onDividerPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) {
        return;
      }
      const containerWidth = getContainerWidth();
      if (containerWidth <= 0) {
        return;
      }
      const deltaPercent = ((event.clientX - startX.current) / containerWidth) * 100;
      onResize(startPercent.current + deltaPercent);
    },
    [getContainerWidth, onResize],
  );

  const onDividerPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  return {
    onDividerPointerDown,
    onDividerPointerMove,
    onDividerPointerUp,
  };
}
