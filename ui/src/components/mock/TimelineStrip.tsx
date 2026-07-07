import type { RefObject, UIEvent } from "react";
import { useMemo } from "react";
import { useMockProject } from "../../context/MockProjectContext";
import {
  TIMESCALE_WEEKS,
  buildTaskBarColorMap,
  ganttChartWidthPx,
  withAlpha,
} from "../../mock/demo";

type TimelineStripProps = {
  chartWidth?: number;
  weekWidthPx?: number;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  fitChart?: boolean;
};

export function TimelineStrip({
  chartWidth = ganttChartWidthPx(),
  weekWidthPx,
  scrollRef,
  onScroll,
  fitChart = false,
}: TimelineStripProps) {
  const { tasks } = useMockProject();
  const taskBarColors = useMemo(() => buildTaskBarColorMap(tasks), [tasks]);
  const milestones = tasks.filter((t) => t.isMilestone);
  const startLabel = TIMESCALE_WEEKS[0] ?? "Jul 6";
  const endLabel = TIMESCALE_WEEKS[TIMESCALE_WEEKS.length - 1] ?? "Jan 11";

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={[
        "shrink-0 border-b border-nest-border bg-nest-surface px-3 py-1.5",
        fitChart ? "overflow-x-hidden" : "overflow-x-auto",
      ].join(" ")}
    >
      <div style={{ width: chartWidth, minWidth: chartWidth }}>
        <div className="relative h-8 rounded-nest-sm border border-nest-border bg-nest-muted/5">
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-nest-primary/40"
            style={{ left: "2%", width: "94%" }}
          />
          {milestones.map((m) => {
            const color = taskBarColors.get(m.id) ?? "#003f2d";
            return (
              <div
                key={m.id}
                className="absolute top-1/2 size-3 -translate-y-1/2 rotate-45 border-2"
                style={{
                  left: `${m.bar.left + m.bar.width}%`,
                  borderColor: color,
                  backgroundColor: withAlpha(color, 0.85),
                }}
                title={m.name}
              />
            );
          })}
          <span className="absolute bottom-0.5 left-2 text-[9px] text-nest-muted">
            {startLabel}
          </span>
          <span className="absolute bottom-0.5 right-2 text-[9px] text-nest-muted">
            {endLabel}
          </span>
        </div>
        {weekWidthPx ? (
          <span className="sr-only">Week column width: {Math.round(weekWidthPx)}px</span>
        ) : null}
      </div>
    </div>
  );
}
