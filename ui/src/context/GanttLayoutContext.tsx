import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const GRID_WIDTH_STORAGE_KEY = "swift.ganttGridWidthPercent";
const SHOW_TIMELINE_STORAGE_KEY = "swift.showTimeline";

type GanttLayoutContextValue = {
  gridHidden: boolean;
  fitChart: boolean;
  showTimeline: boolean;
  toggleTimeline: () => void;
  gridWidthPercent: number;
  setGridWidthPercent: (percent: number) => void;
  expandChart: () => void;
  restoreChart: () => void;
  toggleFitChart: () => void;
  onSplitResizeStart: () => void;
};

const GanttLayoutContext = createContext<GanttLayoutContextValue | null>(null);

function readStoredGridWidth(): number {
  const stored = localStorage.getItem(GRID_WIDTH_STORAGE_KEY);
  if (stored) {
    const parsed = Number.parseFloat(stored);
    if (!Number.isNaN(parsed)) {
      return clamp(parsed, 20, 75);
    }
  }
  return 48;
}

function readStoredShowTimeline(): boolean {
  return localStorage.getItem(SHOW_TIMELINE_STORAGE_KEY) !== "false";
}

export function GanttLayoutProvider({ children }: { children: ReactNode }) {
  const [gridHidden, setGridHidden] = useState(false);
  const [fitChart, setFitChart] = useState(false);
  const [showTimeline, setShowTimeline] = useState(readStoredShowTimeline);
  const [gridWidthPercent, setGridWidthPercentState] = useState(readStoredGridWidth);

  const setGridWidthPercent = useCallback((percent: number) => {
    const next = clamp(percent, 20, 75);
    setGridWidthPercentState(next);
    localStorage.setItem(GRID_WIDTH_STORAGE_KEY, String(next));
  }, []);

  const expandChart = useCallback(() => {
    setGridHidden(true);
    setFitChart(true);
  }, []);

  const restoreChart = useCallback(() => {
    setGridHidden(false);
    setFitChart(false);
  }, []);

  const toggleFitChart = useCallback(() => {
    setFitChart((current) => !current);
  }, []);

  const onSplitResizeStart = useCallback(() => {
    setFitChart(false);
  }, []);

  const toggleTimeline = useCallback(() => {
    setShowTimeline((current) => {
      const next = !current;
      localStorage.setItem(SHOW_TIMELINE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      gridHidden,
      fitChart,
      showTimeline,
      toggleTimeline,
      gridWidthPercent,
      setGridWidthPercent,
      expandChart,
      restoreChart,
      toggleFitChart,
      onSplitResizeStart,
    }),
    [
      gridHidden,
      fitChart,
      showTimeline,
      toggleTimeline,
      gridWidthPercent,
      setGridWidthPercent,
      expandChart,
      restoreChart,
      toggleFitChart,
      onSplitResizeStart,
    ],
  );

  return (
    <GanttLayoutContext.Provider value={value}>{children}</GanttLayoutContext.Provider>
  );
}

export function useGanttLayout() {
  const context = useContext(GanttLayoutContext);
  if (!context) {
    throw new Error("useGanttLayout must be used within GanttLayoutProvider");
  }
  return context;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
