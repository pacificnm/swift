import { useStatusBar, type StatusVariant } from "../context/StatusBarContext";

const VARIANT_CLASS: Record<StatusVariant, string> = {
  info: "text-nest-info",
  success: "text-nest-success",
  warning: "text-nest-warning",
  error: "text-nest-error",
};

type StatusBarProps = {
  viewLabel?: string;
  zoom?: number;
  newTasks?: number;
};

export function StatusBar({
  viewLabel = "Gantt Chart",
  zoom = 100,
  newTasks = 0,
}: StatusBarProps) {
  const { message, variant } = useStatusBar();

  return (
    <footer
      className="flex h-6 shrink-0 items-stretch border-t border-nest-border bg-nest-surface text-[11px]"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex w-36 shrink-0 items-center border-r border-nest-border px-2 font-medium text-nest-foreground">
        New Tasks: {newTasks}
      </div>
      <p
        className={`flex min-w-0 flex-1 items-center truncate px-2 ${VARIANT_CLASS[variant]}`}
      >
        {message}
      </p>
      <div className="flex w-44 shrink-0 items-center justify-end gap-2 border-l border-nest-border px-2 font-medium text-nest-foreground">
        <span className="truncate">{viewLabel}</span>
        <span>|</span>
        <span>{zoom}%</span>
      </div>
    </footer>
  );
}
