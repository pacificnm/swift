import { useState, type ReactNode } from "react";
import {
  faChevronUp,
  faCompress,
  faExpand,
  faFloppyDisk,
  faGripLines,
  faTrash,
  faXmark,
} from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { DatePicker } from "../DatePicker";
import { ConfirmDialog } from "../ConfirmDialog";
import { RichTextEditor } from "../RichTextEditor";
import { useMockProject } from "../../context/MockProjectContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";
import { useMaxPaneHeight, useVerticalResize } from "../../hooks/useVerticalResize";
import { parseTaskDateDisplay, parseTaskDuration, todayIsoDate } from "../../mock/demo";
import { taskFieldOptions } from "../../mock/settingsDemo";
import { useMockSettings } from "../../context/MockSettingsContext";

type TaskFormTab = "general" | "predecessors" | "advanced" | "notes";

const INPUT_CLASS =
  "w-full rounded-nest-sm border border-nest-border bg-nest-background px-2 py-1.5 text-xs text-nest-foreground focus:border-nest-primary focus:outline-none focus:ring-1 focus:ring-nest-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

export function TaskDetailsPane() {
  const {
    selectedTask,
    selectedTaskId,
    showTaskDetails,
    setShowTaskDetails,
    deleteTask,
  } = useMockProject();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const maxHeight = useMaxPaneHeight(0.55);
  const { height, setHeight, onResizePointerDown, onResizePointerMove, onResizePointerUp } =
    useVerticalResize({
      defaultHeight: 200,
      minHeight: 160,
      maxHeight,
    });
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<TaskFormTab>("general");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(
    null,
  );

  const toggleExpanded = () => {
    if (expanded) {
      setHeight(160);
      setExpanded(false);
    } else {
      setHeight(maxHeight);
      setExpanded(true);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }
    deleteTask(deleteTarget.id);
    setStatus(`Deleted task: ${deleteTarget.name}`, { variant: "info" });
    toast.warning(`Deleted task: ${deleteTarget.name}`);
    setDeleteTarget(null);
  };

  return (
    <>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete task?"
        message={
          deleteTarget
            ? `Delete “${deleteTarget.name}” from this project? This cannot be undone in the mockup.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
      {!showTaskDetails ? null : (
      <div
      className="flex shrink-0 flex-col border-t border-nest-border bg-nest-surface"
      style={{ height }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize task form"
        className="group flex h-2 shrink-0 cursor-ns-resize items-center justify-center border-b border-nest-border bg-nest-background hover:bg-nest-primary/10"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
      >
        <Icon
          icon={faGripLines}
          className="size-4 text-nest-muted group-hover:text-nest-primary"
        />
      </div>

      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-nest-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-nest-foreground">
            Task Form
          </span>
          {expanded ? (
            <span className="rounded-nest-sm bg-nest-primary/10 px-1.5 py-0.5 text-[10px] text-nest-primary">
              Expanded
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          <PaneButton
            label={expanded ? "Restore" : "Expand"}
            onClick={toggleExpanded}
          >
            {expanded ? (
              <Icon icon={faCompress} className="size-3.5" />
            ) : (
              <Icon icon={faExpand} className="size-3.5" />
            )}
          </PaneButton>
          <PaneButton
            label="Close"
            onClick={() => setShowTaskDetails(false)}
          >
            <Icon icon={faXmark} className="size-3.5" />
          </PaneButton>
        </div>
      </div>

      <div className="flex shrink-0 gap-1 border-b border-nest-border px-2 pt-1">
        {(
          [
            ["general", "General"],
            ["predecessors", "Predecessors"],
            ["advanced", "Advanced"],
            ["notes", "Notes"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={[
              "rounded-t-nest-sm px-3 py-1.5 text-[11px] font-medium transition-colors",
              tab === id
                ? "bg-nest-background text-nest-primary"
                : "text-nest-muted hover:bg-nest-background/60 hover:text-nest-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {!selectedTask ? (
          <p className="flex h-full items-center justify-center text-xs text-nest-muted">
            Select a task in the grid or Gantt chart.
          </p>
        ) : tab === "general" ? (
          <GeneralFields task={selectedTask} expanded={expanded} />
        ) : tab === "predecessors" ? (
          <PredecessorsTab task={selectedTask} />
        ) : tab === "advanced" ? (
          <AdvancedTab task={selectedTask} />
        ) : (
          <NotesTab task={selectedTask} />
        )}
      </div>

      <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-nest-border bg-nest-surface px-3 py-2">
        <button
          type="button"
          disabled={!selectedTask}
          onClick={() => {
            if (!selectedTaskId || !selectedTask) {
              return;
            }
            setDeleteTarget({ id: selectedTaskId, name: selectedTask.name });
          }}
          className="inline-flex items-center gap-1.5 rounded-nest-md border border-nest-border px-3 py-1.5 text-xs text-nest-error hover:bg-nest-error/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon icon={faTrash} className="size-3" />
          Delete
        </button>
        <button
          type="button"
          disabled={!selectedTask}
          onClick={() => {
            if (!selectedTask) {
              return;
            }
            setStatus(`Saved task: ${selectedTask.name}`, { variant: "success" });
            toast.success(`Saved task: ${selectedTask.name}`);
          }}
          className="inline-flex items-center gap-1.5 rounded-nest-md bg-nest-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-nest-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon icon={faFloppyDisk} className="size-3" />
          Save
        </button>
      </footer>
    </div>
      )}
    </>
  );
}

function PaneButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="rounded-nest-sm p-1 text-nest-muted hover:bg-nest-background hover:text-nest-foreground"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function GeneralFields({
  task,
  expanded,
}: {
  task: NonNullable<ReturnType<typeof useMockProject>["selectedTask"]>;
  expanded: boolean;
}) {
  const { updateTask } = useMockProject();
  const startIso = parseTaskDateDisplay(task.start) ?? todayIsoDate();
  const finishIso = parseTaskDateDisplay(task.finish) ?? startIso;
  const durationDays = parseTaskDuration(task.duration);

  const handleStartChange = (startDate: string) => {
    const finishDate = task.isMilestone
      ? startDate
      : finishIso < startDate
        ? startDate
        : finishIso;
    updateTask(task.id, { startDate, finishDate });
  };

  const handleFinishChange = (finishDate: string) => {
    if (finishDate < startIso) {
      return;
    }
    updateTask(task.id, { finishDate });
  };

  const handleDurationChange = (value: number) => {
    const days = Math.max(0, value);
    updateTask(task.id, { durationDays: days });
  };

  return (
    <div
      className={[
        "grid gap-x-6 gap-y-3 text-xs",
        expanded ? "grid-cols-3" : "grid-cols-2",
      ].join(" ")}
    >
      <TextField
        label="Name"
        value={task.name}
        onChange={(value) => updateTask(task.id, { name: value })}
        className={expanded ? "col-span-3" : "col-span-2"}
      />
      <NumberField
        label="Duration (days)"
        value={durationDays}
        min={0}
        disabled={task.isMilestone}
        onChange={handleDurationChange}
      />
      <NumberField
        label="% Complete"
        value={task.percentComplete}
        min={0}
        max={100}
        onChange={(value) => updateTask(task.id, { percentComplete: value })}
      />
      <DateField
        label="Start"
        value={startIso}
        onChange={handleStartChange}
      />
      <DateField
        label="Finish"
        value={finishIso}
        min={startIso}
        disabled={task.isMilestone}
        onChange={handleFinishChange}
      />
      <TextField
        label="Predecessors"
        value={task.predecessors}
        placeholder="e.g. 2"
        onChange={(value) => updateTask(task.id, { predecessors: value })}
      />
      <TextField
        label="Resource Names"
        value={task.resources}
        placeholder="e.g. You"
        onChange={(value) => updateTask(task.id, { resources: value })}
      />
      {expanded ? (
        <>
          <ReadOnlyField label="Task mode" value="Auto Scheduled" />
          <ReadOnlyField label="Outline level" value={String(task.outlineLevel + 1)} />
          <ReadOnlyField label="Summary" value={task.isSummary ? "Yes" : "No"} />
          <ReadOnlyField label="Milestone" value={task.isMilestone ? "Yes" : "No"} />
        </>
      ) : null}
    </div>
  );
}

function PredecessorsTab({
  task,
}: {
  task: NonNullable<ReturnType<typeof useMockProject>["selectedTask"]>;
}) {
  const { updateTask } = useMockProject();

  return (
    <div className="space-y-4 text-xs">
      <TextField
        label="Predecessors"
        value={task.predecessors}
        placeholder="Row ID (e.g. 2) or 2FS+1d"
        hint="Enter predecessor row IDs from the task grid."
        onChange={(value) => updateTask(task.id, { predecessors: value })}
      />

      {task.predecessors ? (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-nest-border text-left text-nest-muted">
              <th className="px-2 py-1.5 font-medium">ID</th>
              <th className="px-2 py-1.5 font-medium">Predecessor Name</th>
              <th className="px-2 py-1.5 font-medium">Type</th>
              <th className="px-2 py-1.5 font-medium">Lag</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-nest-border/60">
              <td className="px-2 py-2">{task.predecessors}</td>
              <td className="px-2 py-2 text-nest-muted">(linked task)</td>
              <td className="px-2 py-2">FS</td>
              <td className="px-2 py-2">0d</td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p className="text-nest-muted">
          No predecessors for <strong>{task.name}</strong>.
        </p>
      )}
    </div>
  );
}

function AdvancedTab({
  task,
}: {
  task: NonNullable<ReturnType<typeof useMockProject>["selectedTask"]>;
}) {
  const { updateTask } = useMockProject();
  const { settings } = useMockSettings();

  const priorityOptions = taskFieldOptions(settings.task.priorities, task.priority);
  const constraintOptions = taskFieldOptions(
    settings.task.constraintTypes,
    task.constraintType,
  );
  const taskTypeOptions = taskFieldOptions(settings.task.taskTypes, task.taskType);

  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-3 text-xs">
      <SelectField
        label="Priority"
        value={task.priority ?? settings.task.priorities[1] ?? "Normal"}
        options={priorityOptions}
        onChange={(value) => updateTask(task.id, { priority: value })}
      />
      <SelectField
        label="Constraint type"
        value={task.constraintType ?? settings.task.constraintTypes[0] ?? "As Soon As Possible"}
        options={constraintOptions}
        onChange={(value) => updateTask(task.id, { constraintType: value })}
      />
      <DateField
        label="Constraint date"
        value={task.constraintDate ?? ""}
        placeholder="None"
        onChange={(value) => updateTask(task.id, { constraintDate: value })}
      />
      <DateField
        label="Deadline"
        value={task.deadline ?? ""}
        placeholder="None"
        onChange={(value) => updateTask(task.id, { deadline: value })}
      />
      {task.isSummary ? (
        <ReadOnlyField label="Task type" value="Summary" />
      ) : (
        <SelectField
          label="Task type"
          value={task.taskType ?? settings.task.taskTypes[0] ?? "Fixed Duration"}
          options={taskTypeOptions}
          onChange={(value) => updateTask(task.id, { taskType: value })}
        />
      )}
      <CheckboxField
        label="Effort driven"
        checked={task.effortDriven ?? false}
        onChange={(checked) => updateTask(task.id, { effortDriven: checked })}
      />
    </div>
  );
}

function NotesTab({
  task,
}: {
  task: NonNullable<ReturnType<typeof useMockProject>["selectedTask"]>;
}) {
  const { updateTask } = useMockProject();

  return (
    <div className="flex h-full min-h-[8rem] flex-col gap-1 text-xs">
      <span className="text-[10px] font-medium uppercase tracking-wide text-nest-muted">
        Notes
      </span>
      <RichTextEditor
        value={task.notes ?? ""}
        onChange={(html) => updateTask(task.id, { notes: html })}
        placeholder="Task notes…"
        ariaLabel="Task notes"
        className="min-h-[6rem] flex-1 text-xs"
      />
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-nest-muted">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      />
      {hint ? <span className="text-[10px] text-nest-muted">{hint}</span> : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  disabled,
  className = "",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-nest-muted">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={INPUT_CLASS}
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: readonly string[] | string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-nest-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT_CLASS}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
  className = "",
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <label className={`flex flex-col justify-end gap-1 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-nest-muted">
        {label}
      </span>
      <label className="inline-flex items-center gap-2 py-1.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-3.5 rounded border-nest-border text-nest-primary focus:ring-nest-primary/30"
        />
        <span className="text-xs text-nest-foreground">{checked ? "Yes" : "No"}</span>
      </label>
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  disabled,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  min?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-nest-muted">
        {label}
      </span>
      <DatePicker
        value={value}
        onChange={onChange}
        min={min}
        disabled={disabled}
        placeholder={placeholder}
        variant="compact"
      />
    </label>
  );
}

function ReadOnlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-nest-muted">
        {label}
      </span>
      <span className="rounded-nest-sm border border-nest-border bg-nest-muted/5 px-2 py-1.5 text-nest-foreground">
        {value}
      </span>
    </label>
  );
}

/** Collapsed strip shown when task form is hidden — click to reopen. */
export function TaskFormCollapsedBar() {
  const { showTaskDetails, setShowTaskDetails } = useMockProject();

  if (showTaskDetails) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setShowTaskDetails(true)}
      className="flex h-7 shrink-0 items-center justify-center gap-1 border-t border-nest-border bg-nest-surface text-xs text-nest-muted hover:bg-nest-background hover:text-nest-foreground"
    >
      <Icon icon={faChevronUp} className="size-3.5" />
      Show Task Form
    </button>
  );
}
