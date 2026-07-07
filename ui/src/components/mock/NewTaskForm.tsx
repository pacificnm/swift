import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { faClipboardList, faXmark } from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { DatePicker } from "../DatePicker";
import { useMockProject } from "../../context/MockProjectContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";
import {
  addCalendarDays,
  formatTaskDate,
  todayIsoDate,
  type NewTaskInput,
} from "../../mock/demo";

const DEFAULT_RESOURCE = "You";

export function NewTaskForm() {
  const titleId = useId();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const {
    newTaskOpen,
    closeNewTask,
    createTask,
    project,
    selectedTask,
    tasks,
  } = useMockProject();

  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState(1);
  const [startDate, setStartDate] = useState(todayIsoDate);
  const [finishDate, setFinishDate] = useState(todayIsoDate);
  const [percentComplete, setPercentComplete] = useState(0);
  const [resources, setResources] = useState(DEFAULT_RESOURCE);
  const [predecessors, setPredecessors] = useState("");
  const [isMilestone, setIsMilestone] = useState(false);
  const [isSummary, setIsSummary] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const defaultOutlineLevel = selectedTask?.outlineLevel ?? 0;
  const insertHint = selectedTask
    ? `Inserts after “${selectedTask.name}” at outline level ${defaultOutlineLevel + 1}.`
    : tasks.length === 0
      ? "First task in this project."
      : "Appends to the end of the schedule.";

  useEffect(() => {
    if (!newTaskOpen) {
      return;
    }
    const defaultStart = project.startDate || todayIsoDate();
    const finish = addCalendarDays(defaultStart, 1);
    setName("");
    setDurationDays(1);
    setStartDate(defaultStart);
    setFinishDate(finish);
    setPercentComplete(0);
    setResources(DEFAULT_RESOURCE);
    setPredecessors(selectedTask ? "" : "");
    setIsMilestone(false);
    setIsSummary(false);
    setNotes("");
    setError(null);
  }, [newTaskOpen, project.startDate, selectedTask]);

  useEffect(() => {
    if (!newTaskOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNewTask();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newTaskOpen, closeNewTask]);

  useEffect(() => {
    if (isMilestone) {
      setDurationDays(0);
      setFinishDate(startDate);
      return;
    }
    setFinishDate(addCalendarDays(startDate, Math.max(1, durationDays)));
  }, [startDate, durationDays, isMilestone]);

  if (!newTaskOpen) {
    return null;
  }

  const handleDurationChange = (value: number) => {
    const days = Math.max(0, value);
    setDurationDays(days);
    if (days === 0) {
      setIsMilestone(true);
    }
  };

  const handleMilestoneChange = (checked: boolean) => {
    setIsMilestone(checked);
    if (checked) {
      setDurationDays(0);
      setFinishDate(startDate);
    } else {
      setDurationDays(1);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Task name is required.");
      toast.error("Task name is required.");
      return;
    }
    if (finishDate < startDate) {
      setError("Finish must be on or after the start date.");
      toast.error("Finish must be on or after the start date.");
      return;
    }
    if (percentComplete < 0 || percentComplete > 100) {
      setError("% Complete must be between 0 and 100.");
      toast.error("% Complete must be between 0 and 100.");
      return;
    }

    const input: NewTaskInput = {
      name: trimmedName,
      durationDays: isMilestone ? 0 : durationDays,
      startDate,
      finishDate,
      percentComplete,
      resources,
      predecessors,
      isMilestone,
      isSummary,
      outlineLevel: defaultOutlineLevel,
      notes: notes.trim() || undefined,
    };

    const task = createTask(input);
    setStatus(`Created task: ${task.name}`, { variant: "success" });
    toast.success(`Created task: ${task.name}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={closeNewTask}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90vh,42rem)] w-full max-w-lg flex-col overflow-hidden rounded-nest-lg border border-nest-border bg-nest-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-nest-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Icon icon={faClipboardList} className="size-3.5 text-nest-primary" />
            <h2 id={titleId} className="text-sm font-semibold">
              New Task
            </h2>
          </div>
          <button
            type="button"
            onClick={closeNewTask}
            className="rounded-nest-sm p-1 text-nest-muted hover:bg-nest-muted/10 hover:text-nest-foreground"
            aria-label="Close"
          >
            <Icon icon={faXmark} className="size-3.5" />
          </button>
        </header>

        <form
          id="new-task-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-auto px-5 py-4"
        >
          <p className="mb-4 text-xs text-nest-muted">
            Task Information for <strong>{project.name}</strong>. {insertHint}
          </p>

          <div className="space-y-4">
            <FormField label="Task Name" required>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Draft specification"
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Duration (days)" hint="0 for milestones.">
                <input
                  type="number"
                  min={0}
                  value={durationDays}
                  disabled={isMilestone}
                  onChange={(e) => handleDurationChange(Number(e.target.value))}
                  className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm disabled:opacity-60"
                />
              </FormField>
              <FormField label="% Complete">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={percentComplete}
                  onChange={(e) => setPercentComplete(Number(e.target.value))}
                  className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start" required>
                <DatePicker
                  variant="default"
                  placement="below"
                  value={startDate}
                  onChange={setStartDate}
                />
              </FormField>
              <FormField label="Finish" required>
                <DatePicker
                  variant="default"
                  placement="below"
                  value={finishDate}
                  min={startDate}
                  disabled={isMilestone}
                  onChange={setFinishDate}
                />
              </FormField>
            </div>

            <p className="text-[10px] text-nest-muted">
              Grid preview: {formatTaskDate(startDate)} → {formatTaskDate(finishDate)}
            </p>

            <FormField label="Resource Names">
              <input
                type="text"
                value={resources}
                onChange={(e) => setResources(e.target.value)}
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
              />
            </FormField>

            <FormField label="Predecessors" hint="Row ID from the Gantt grid (e.g. 2).">
              <input
                type="text"
                value={predecessors}
                onChange={(e) => setPredecessors(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 font-mono text-sm"
              />
            </FormField>

            <FormField label="Notes">
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Task notes — shown in Task Form Notes tab"
                className="w-full resize-y rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
              />
            </FormField>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isMilestone}
                  onChange={(e) => handleMilestoneChange(e.target.checked)}
                />
                Milestone
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSummary}
                  onChange={(e) => setIsSummary(e.target.checked)}
                />
                Summary task
              </label>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-nest-md bg-nest-error/10 px-3 py-2 text-xs text-nest-error">
              {error}
            </p>
          ) : null}
        </form>

        <footer className="flex justify-end gap-2 border-t border-nest-border px-5 py-3">
          <button
            type="button"
            onClick={closeNewTask}
            className="rounded-nest-md border border-nest-border px-4 py-2 text-sm hover:bg-nest-muted/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-task-form"
            className="rounded-nest-md bg-nest-primary px-4 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
          >
            Create Task
          </button>
        </footer>
      </div>
    </div>
  );
}

function FormField({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-nest-muted">
        {label}
        {required ? <span className="text-nest-error"> *</span> : null}
      </span>
      {hint ? <span className="mt-0.5 block text-[10px] text-nest-muted/80">{hint}</span> : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}
