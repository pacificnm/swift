import { CALENDAR_WEEKS } from "../../mock/demo";
import { useMockProject } from "../../context/MockProjectContext";

export function CalendarView() {
  const { tasks } = useMockProject();
  const taskBars = tasks.filter((t) => !t.isMilestone && !t.isSummary);

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <p className="mb-3 text-xs text-nest-muted">
        Calendar view mock — task bars by week (phase 2c).
      </p>
      <div className="space-y-4">
        {CALENDAR_WEEKS.map((week) => (
          <section
            key={week.label}
            className="rounded-nest-md border border-nest-border bg-nest-surface"
          >
            <h2 className="border-b border-nest-border px-3 py-2 text-sm font-medium">
              {week.label}
            </h2>
            <div className="grid grid-cols-5 divide-x divide-nest-border">
              {week.days.map((day) => (
                <div key={day} className="min-h-[5rem] p-2">
                  <p className="mb-2 text-[10px] font-medium text-nest-muted">
                    {day}
                  </p>
                  {taskBars
                    .filter((_, i) => day.includes(String(7 + i)) || day.includes("14"))
                    .slice(0, 2)
                    .map((task) => (
                      <div
                        key={`${day}-${task.id}`}
                        className="mb-1 truncate rounded-nest-sm bg-nest-primary/20 px-1.5 py-0.5 text-[10px]"
                        title={task.name}
                      >
                        {task.name}
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function NetworkDiagramView() {
  const { tasks } = useMockProject();
  const nodes = tasks.filter((t) => !t.isSummary).slice(0, 6);

  return (
    <div className="relative h-full overflow-auto bg-nest-muted/5 p-8">
      <p className="absolute left-4 top-4 text-xs text-nest-muted">
        Network diagram mock — PERT layout (deferred).
      </p>
      <svg className="mx-auto h-[420px] w-full max-w-3xl" aria-hidden>
        {nodes.slice(1).map((node, i) => (
          <line
            key={`line-${node.id}`}
            x1={80 + i * 110}
            y1="120"
            x2={130 + i * 110}
            y2="200"
            stroke="var(--nest-color-border)"
            strokeWidth="2"
            markerEnd="url(#arrow)"
          />
        ))}
        <defs>
          <marker
            id="arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--nest-color-muted)" />
          </marker>
        </defs>
        {nodes.map((node, i) => (
          <g key={node.id} transform={`translate(${60 + i * 100}, ${100 + (i % 2) * 100})`}>
            <rect
              width="88"
              height="44"
              rx="4"
              fill="var(--nest-color-surface)"
              stroke="var(--nest-color-border)"
            />
            <text
              x="44"
              y="26"
              textAnchor="middle"
              fontSize="9"
              fill="var(--nest-color-foreground)"
            >
              {node.name.length > 14 ? `${node.name.slice(0, 12)}…` : node.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
