import type { MouseEvent, ReactNode, RefObject, UIEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { faAnglesRight, faChevronDown, faChevronRight, faGripLines } from "../lib/fontawesome";
import { Icon } from "./Icon";
import { useGanttLayout } from "../context/GanttLayoutContext";
import { useMockProject } from "../context/MockProjectContext";
import { useHorizontalSplit } from "../hooks/useHorizontalSplit";
import { TaskDetailsPane, TaskFormCollapsedBar } from "./mock/TaskDetailsPane";
import { TimelineStrip } from "./mock/TimelineStrip";
import type { MockTask } from "../mock/demo";
import {
  GANTT_WEEK_WIDTH_PX,
  TIMESCALE_WEEKS,
  buildTaskBarColorMap,
  ganttChartWidthPx,
  ganttWeekWidthForViewport,
  withAlpha,
} from "../mock/demo";

const COLUMNS = [
  { key: "name", label: "Task Name", className: "min-w-[12rem] flex-1" },
  { key: "duration", label: "Duration", className: "w-20" },
  { key: "start", label: "Start", className: "w-24" },
  { key: "finish", label: "Finish", className: "w-24" },
  { key: "predecessors", label: "Predecessors", className: "w-24" },
  { key: "resources", label: "Resource Names", className: "w-28" },
  { key: "percentComplete", label: "% Complete", className: "w-20" },
] as const;

const ROW_HEIGHT = 28;

export function GanttChartView() {
  const {
    tasks,
    visibleTasks,
    selectedTaskIds,
    selectTask,
    isSummaryCollapsed,
    toggleSummaryCollapsed,
  } = useMockProject();
  const {
    gridHidden,
    fitChart,
    showTimeline,
    gridWidthPercent,
    setGridWidthPercent,
    restoreChart,
    onSplitResizeStart,
  } = useGanttLayout();
  const taskBarColors = useMemo(() => buildTaskBarColorMap(tasks), [tasks]);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const gridScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const ganttViewportRef = useRef<HTMLDivElement>(null);
  const syncingScrollRef = useRef(false);
  const [ganttViewportWidth, setGanttViewportWidth] = useState(0);

  const weekWidthPx =
    fitChart && ganttViewportWidth > 0
      ? ganttWeekWidthForViewport(ganttViewportWidth)
      : GANTT_WEEK_WIDTH_PX;
  const chartWidth =
    fitChart && ganttViewportWidth > 0 ? ganttViewportWidth : ganttChartWidthPx(weekWidthPx);

  useEffect(() => {
    const el = ganttViewportRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setGanttViewportWidth(Math.floor(width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [gridHidden, fitChart]);

  const getContainerWidth = useCallback(
    () => splitContainerRef.current?.offsetWidth ?? 0,
    [],
  );
  const getStartPercent = useCallback(() => gridWidthPercent, [gridWidthPercent]);

  const { onDividerPointerDown, onDividerPointerMove, onDividerPointerUp } =
    useHorizontalSplit({
      onResizeStart: onSplitResizeStart,
      onResize: setGridWidthPercent,
      getContainerWidth,
      getStartPercent,
    });

  const syncVerticalScroll = (source: "grid" | "gantt") => {
    if (syncingScrollRef.current) {
      return;
    }
    const grid = gridScrollRef.current;
    const gantt = ganttScrollRef.current;
    if (!grid || !gantt) {
      return;
    }
    syncingScrollRef.current = true;
    if (source === "grid") {
      gantt.scrollTop = grid.scrollTop;
    } else {
      grid.scrollTop = gantt.scrollTop;
    }
    syncingScrollRef.current = false;
  };

  const syncHorizontalScroll = (source: "timeline" | "gantt") => {
    if (fitChart || syncingScrollRef.current) {
      return;
    }
    const timeline = timelineScrollRef.current;
    const gantt = ganttScrollRef.current;
    if (!timeline || !gantt) {
      return;
    }
    syncingScrollRef.current = true;
    if (source === "timeline") {
      gantt.scrollLeft = timeline.scrollLeft;
    } else {
      timeline.scrollLeft = gantt.scrollLeft;
    }
    syncingScrollRef.current = false;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showTimeline ? (
        <TimelineStrip
          chartWidth={chartWidth}
          weekWidthPx={weekWidthPx}
          scrollRef={timelineScrollRef}
          onScroll={() => syncHorizontalScroll("timeline")}
          fitChart={fitChart}
        />
      ) : null}

      <div ref={splitContainerRef} className="relative flex min-h-0 flex-1">
        {!gridHidden ? (
          <div
            style={{ width: `${gridWidthPercent}%` }}
            className="flex min-w-[16rem] shrink-0 flex-col border-r border-nest-border"
          >
            <GridHeader />
            <div
              ref={gridScrollRef}
              onScroll={() => syncVerticalScroll("grid")}
              className="min-h-0 flex-1 overflow-auto"
            >
              {visibleTasks.map((task) => (
                <GridRow
                  key={task.id}
                  task={task}
                  selected={selectedTaskIds.includes(task.id)}
                  collapsed={task.isSummary && isSummaryCollapsed(task.id)}
                  onSelect={(event) =>
                    selectTask(task.id, {
                      additive: event.ctrlKey || event.metaKey,
                      range: event.shiftKey,
                    })
                  }
                  onToggleCollapse={() => toggleSummaryCollapsed(task.id)}
                  barColor={taskBarColors.get(task.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        {!gridHidden ? (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize task table and Gantt chart"
            onPointerDown={onDividerPointerDown}
            onPointerMove={onDividerPointerMove}
            onPointerUp={onDividerPointerUp}
            className="group z-10 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center border-x border-nest-border bg-nest-surface hover:bg-nest-primary/10"
          >
            <Icon
              icon={faGripLines}
              className="size-3 text-nest-muted group-hover:text-nest-primary"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={restoreChart}
            className="absolute left-0 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-0.5 rounded-r-nest-md border border-l-0 border-nest-border bg-nest-surface px-1 py-2 text-[10px] text-nest-muted shadow-sm hover:bg-nest-primary/10 hover:text-nest-primary"
            title="Show task table"
          >
            <Icon icon={faAnglesRight} className="size-3" />
            Table
          </button>
        )}

        <GanttPane
          tasks={visibleTasks}
          selectedTaskIds={selectedTaskIds}
          chartWidth={chartWidth}
          weekWidthPx={weekWidthPx}
          fitChart={fitChart}
          viewportRef={ganttViewportRef}
          scrollRef={ganttScrollRef}
          onScroll={() => {
            syncVerticalScroll("gantt");
            syncHorizontalScroll("gantt");
          }}
          onSelect={(taskId, event) =>
            selectTask(taskId, {
              additive: event.ctrlKey || event.metaKey,
              range: event.shiftKey,
            })
          }
          taskBarColors={taskBarColors}
        />
      </div>

      <TaskDetailsPane />
      <TaskFormCollapsedBar />
    </div>
  );
}

function GanttPane({
  tasks,
  selectedTaskIds,
  chartWidth,
  weekWidthPx,
  fitChart,
  viewportRef,
  scrollRef,
  onScroll,
  onSelect,
  taskBarColors,
}: {
  tasks: MockTask[];
  selectedTaskIds: string[];
  chartWidth: number;
  weekWidthPx: number;
  fitChart: boolean;
  viewportRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
  onSelect: (id: string, event: MouseEvent<HTMLButtonElement>) => void;
  taskBarColors: Map<string, string>;
}) {
  const chartHeight = tasks.length * ROW_HEIGHT;

  return (
    <div
      ref={viewportRef}
      className="flex min-w-0 flex-1 flex-col border-l border-nest-border bg-[#EEF0ED]"
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={[
          "min-h-0 flex-1",
          fitChart ? "overflow-y-auto overflow-x-hidden" : "overflow-auto",
        ].join(" ")}
      >
        <div style={{ width: chartWidth, minWidth: chartWidth }}>
          <div className="sticky top-0 z-10 flex h-8 shrink-0 border-b border-nest-border bg-nest-surface text-[10px] text-nest-muted">
            {TIMESCALE_WEEKS.map((week) => (
              <div
                key={week}
                style={{ width: weekWidthPx, minWidth: weekWidthPx }}
                className="flex shrink-0 items-center justify-center border-r border-nest-border font-medium text-nest-foreground last:border-r-0"
              >
                <span className="truncate px-0.5">{week}</span>
              </div>
            ))}
          </div>
          <div className="relative" style={{ minHeight: chartHeight }}>
            <GanttGridLines chartWidth={chartWidth} weekWidthPx={weekWidthPx} />
            {tasks.map((task, index) => (
              <GanttBar
                key={task.id}
                task={task}
                rowIndex={index}
                selected={selectedTaskIds.includes(task.id)}
                onSelect={(event) => onSelect(task.id, event)}
                barColor={taskBarColors.get(task.id) ?? "#003f2d"}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GanttGridLines({
  chartWidth,
  weekWidthPx,
}: {
  chartWidth: number;
  weekWidthPx: number;
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex"
      style={{ width: chartWidth }}
    >
      {TIMESCALE_WEEKS.map((week) => (
        <div
          key={week}
          style={{ width: weekWidthPx, minWidth: weekWidthPx }}
          className="shrink-0 border-r border-nest-border last:border-r-0"
        />
      ))}
    </div>
  );
}

function GridHeader() {
  return (
    <div className="flex h-8 min-w-[52rem] shrink-0 border-b border-nest-border bg-nest-surface text-[11px] font-medium text-nest-muted">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          className={`border-r border-nest-border px-2 py-1.5 last:border-r-0 ${col.className}`}
        >
          {col.label}
        </div>
      ))}
    </div>
  );
}

function GridRow({
  task,
  selected,
  collapsed,
  onSelect,
  onToggleCollapse,
  barColor,
}: {
  task: MockTask;
  selected: boolean;
  collapsed: boolean;
  onSelect: (event: MouseEvent<HTMLDivElement>) => void;
  onToggleCollapse: () => void;
  barColor?: string;
}) {
  const indent = task.outlineLevel * 12;

  const handleToggleCollapse = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleCollapse();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(event as unknown as MouseEvent<HTMLDivElement>);
        }
      }}
      className={[
        "flex h-7 min-w-[52rem] w-full cursor-pointer border-b border-nest-border text-left text-[11px]",
        task.isSummary ? "bg-nest-surface font-semibold text-nest-foreground" : "text-nest-foreground",
        selected
          ? "bg-nest-primary/10 ring-1 ring-inset ring-nest-primary"
          : task.isSummary
            ? "hover:bg-nest-surface/80"
            : "bg-nest-background hover:bg-nest-surface/60",
      ].join(" ")}
    >
      <div
        className="flex min-w-[12rem] flex-1 items-center border-r border-nest-border px-2"
        style={{ paddingLeft: `${8 + indent}px` }}
      >
        {task.isSummary ? (
          <button
            type="button"
            onClick={handleToggleCollapse}
            className="mr-0.5 flex size-4 shrink-0 items-center justify-center rounded-nest-sm text-nest-primary hover:bg-nest-primary/10"
            aria-label={collapsed ? `Expand ${task.name}` : `Collapse ${task.name}`}
            aria-expanded={!collapsed}
          >
            <Icon
              icon={collapsed ? faChevronRight : faChevronDown}
              className="size-2.5"
            />
          </button>
        ) : (
          <span className="mr-0.5 inline-block size-4 shrink-0" aria-hidden />
        )}
        {task.isMilestone ? (
          <span
            className="mr-1"
            style={{ color: barColor ?? "var(--nest-color-warning)" }}
            aria-hidden
          >
            ◆
          </span>
        ) : null}
        <span className="truncate">{task.name}</span>
        {barColor ? (
          <span
            className="ml-auto size-2 shrink-0 rounded-full"
            style={{ backgroundColor: barColor }}
            title="Bar color"
            aria-hidden
          />
        ) : null}
      </div>
      <Cell className="w-20">{task.duration}</Cell>
      <Cell className="w-24">{task.start}</Cell>
      <Cell className="w-24">{task.finish}</Cell>
      <Cell className="w-24">{task.predecessors}</Cell>
      <Cell className="w-28 truncate">{task.resources}</Cell>
      <Cell className="w-20">{task.percentComplete}%</Cell>
    </div>
  );
}

function Cell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center border-r border-nest-border px-2 last:border-r-0 ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function GanttBar({
  task,
  rowIndex,
  selected,
  onSelect,
  barColor,
}: {
  task: MockTask;
  rowIndex: number;
  selected: boolean;
  onSelect: (event: MouseEvent<HTMLButtonElement>) => void;
  barColor: string;
}) {
  const top = rowIndex * ROW_HEIGHT + 4;
  const fillAlpha = task.isSummary ? 0.5 : 0.35;
  const progressAlpha = 0.9;

  if (task.isMilestone) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="absolute z-10"
        style={{ top: top + 2, left: `calc(${task.bar.left}% + ${task.bar.width}%)` }}
        title={task.name}
      >
        <span
          className="block size-3 rotate-45 border-2"
          style={{
            borderColor: selected ? "var(--nest-color-primary)" : barColor,
            backgroundColor: selected
              ? "var(--nest-color-primary)"
              : withAlpha(barColor, 0.85),
          }}
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className="absolute z-10 h-5 text-left"
      style={{
        top,
        left: `${task.bar.left}%`,
        width: `${task.bar.width}%`,
      }}
      title={`${task.name} (${task.percentComplete}%)`}
    >
      <div
        className={[
          "relative h-full overflow-hidden rounded-nest-sm border",
          selected ? "ring-2 ring-nest-primary" : "",
        ].join(" ")}
        style={{
          borderColor: barColor,
          backgroundColor: withAlpha(barColor, fillAlpha),
        }}
      >
        {task.percentComplete > 0 ? (
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${task.percentComplete}%`,
              backgroundColor: withAlpha(barColor, progressAlpha),
            }}
          />
        ) : null}
      </div>
    </button>
  );
}

export function TaskSheetView() {
  const {
    tasks,
    visibleTasks,
    selectedTaskIds,
    selectTask,
    isSummaryCollapsed,
    toggleSummaryCollapsed,
  } = useMockProject();
  const taskBarColors = useMemo(() => buildTaskBarColorMap(tasks), [tasks]);

  return (
    <div className="flex h-full flex-col">
      <GridHeader />
      <div className="min-h-0 flex-1 overflow-auto">
        {visibleTasks.map((task) => (
          <GridRow
            key={task.id}
            task={task}
            selected={selectedTaskIds.includes(task.id)}
            collapsed={task.isSummary && isSummaryCollapsed(task.id)}
            onSelect={(event) =>
              selectTask(task.id, {
                additive: event.ctrlKey || event.metaKey,
                range: event.shiftKey,
              })
            }
            onToggleCollapse={() => toggleSummaryCollapsed(task.id)}
            barColor={taskBarColors.get(task.id)}
          />
        ))}
      </div>
      <TaskDetailsPane />
      <TaskFormCollapsedBar />
    </div>
  );
}
