import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { faPlus, faXmark } from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { DatePicker } from "../DatePicker";
import { useMockProject } from "../../context/MockProjectContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";
import { viewToPath } from "../../context/ProjectViewContext";
import {
  PROJECT_COLOR_PRESETS,
  slugifyProjectName,
  todayIsoDate,
  type NewProjectInput,
} from "../../mock/demo";

const DEFAULT_MANAGER = "You";

export function NewProjectForm() {
  const titleId = useId();
  const navigate = useNavigate();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const {
    newProjectOpen,
    closeNewProject,
    createProject,
    projects,
  } = useMockProject();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [startDate, setStartDate] = useState(todayIsoDate);
  const [finishDate, setFinishDate] = useState("");
  const [manager, setManager] = useState(DEFAULT_MANAGER);
  const [description, setDescription] = useState("");
  const [color, setColor] = useState<string>(PROJECT_COLOR_PRESETS[3]);
  const [pinned, setPinned] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!newProjectOpen) {
      return;
    }
    setName("");
    setSlug("");
    setSlugTouched(false);
    setStartDate(todayIsoDate());
    setFinishDate("");
    setManager(DEFAULT_MANAGER);
    setDescription("");
    setColor(PROJECT_COLOR_PRESETS[3]);
    setPinned(true);
    setError(null);
  }, [newProjectOpen]);

  useEffect(() => {
    if (!newProjectOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNewProject();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newProjectOpen, closeNewProject]);

  if (!newProjectOpen) {
    return null;
  }

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) {
      setSlug(slugifyProjectName(value));
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();

    if (!trimmedName) {
      setError("Project name is required.");
      toast.error("Project name is required.");
      return;
    }
    if (!trimmedSlug) {
      setError("Slug is required.");
      toast.error("Slug is required.");
      return;
    }
    if (projects.some((p) => p.slug === trimmedSlug)) {
      setError(`Slug "${trimmedSlug}" is already in use.`);
      toast.error(`Slug "${trimmedSlug}" is already in use.`);
      return;
    }
    if (finishDate && finishDate < startDate) {
      setError("Target finish must be on or after the start date.");
      toast.error("Target finish must be on or after the start date.");
      return;
    }

    const input: NewProjectInput = {
      name: trimmedName,
      slug: trimmedSlug,
      description: description.trim() || undefined,
      color,
      startDate,
      finishDate: finishDate || undefined,
      manager,
      pinned,
    };

    const project = createProject(input);
    navigate(viewToPath("gantt"));
    setStatus(`Created project: ${project.name}`, { variant: "success" });
    toast.success(`Created project: ${project.name}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={closeNewProject}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-nest-lg border border-nest-border bg-nest-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-nest-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Icon icon={faPlus} className="size-3.5 text-nest-primary" />
            <h2 id={titleId} className="text-sm font-semibold">
              New Project
            </h2>
          </div>
          <button
            type="button"
            onClick={closeNewProject}
            className="rounded-nest-sm p-1 text-nest-muted hover:bg-nest-muted/10 hover:text-nest-foreground"
            aria-label="Close"
          >
            <Icon icon={faXmark} className="size-3.5" />
          </button>
        </header>

        <form
          id="new-project-form"
          onSubmit={handleSubmit}
          className="min-h-0 flex-1 overflow-auto px-5 py-4"
        >
          <p className="mb-4 text-xs text-nest-muted">
            Create a blank project schedule. Fields match Microsoft Project → Project
            Information; data persists in mock state until phase 2.
          </p>

          <div className="space-y-4">
            <FormField label="Project Name" required>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Kitchen Renovation"
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
              />
            </FormField>

            <FormField
              label="Slug"
              hint="URL-safe key; unique among active projects."
              required
            >
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                placeholder="kitchen-renovation"
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 font-mono text-sm"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Start Date" required>
                <DatePicker
                  variant="default"
                  placement="below"
                  value={startDate}
                  onChange={setStartDate}
                />
              </FormField>
              <FormField label="Target Finish">
                <DatePicker
                  variant="default"
                  placement="below"
                  value={finishDate}
                  min={startDate}
                  placeholder="Optional"
                  onChange={setFinishDate}
                />
              </FormField>
            </div>

            <FormField label="Manager">
              <input
                type="text"
                value={manager}
                onChange={(e) => setManager(e.target.value)}
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
              />
            </FormField>

            <FormField label="Comments">
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short summary for Project Information…"
                className="w-full resize-y rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
              />
            </FormField>

            <div>
              <span className="text-xs font-medium text-nest-muted">Color</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROJECT_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    title={preset}
                    onClick={() => setColor(preset)}
                    className={[
                      "size-7 rounded-full border-2 transition-transform hover:scale-110",
                      color === preset
                        ? "border-nest-foreground ring-2 ring-nest-primary/30"
                        : "border-transparent",
                    ].join(" ")}
                    style={{ backgroundColor: preset }}
                  >
                    <span className="sr-only">{preset}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              Pin to Quick Access (recents)
            </label>
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
            onClick={closeNewProject}
            className="rounded-nest-md border border-nest-border px-4 py-2 text-sm hover:bg-nest-muted/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="new-project-form"
            className="rounded-nest-md bg-nest-primary px-4 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
          >
            Create Project
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
