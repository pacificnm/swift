import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { faBoxArchive, faTrash, faXmark } from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { ConfirmDialog } from "../ConfirmDialog";
import { DatePicker } from "../DatePicker";
import { useMockProject } from "../../context/MockProjectContext";
import { useProjectView, PROJECT_VIEW_LABELS, viewToPath } from "../../context/ProjectViewContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";
import { formatProjectDate, parseProjectDateDisplay } from "../../mock/demo";

export function ProjectInfoView() {
  const { project, updateProject, archiveProject, deleteProject } = useMockProject();
  const { returnView, closeToWorkspace } = useProjectView();
  const navigate = useNavigate();
  const { setStatus } = useStatusBar();
  const toast = useToast();

  const [name, setName] = useState(project.name);
  const [startDate, setStartDate] = useState(project.startDate);
  const [finishDate, setFinishDate] = useState(
    () => parseProjectDateDisplay(project.finish) ?? "",
  );
  const [manager, setManager] = useState(project.manager);
  const [description, setDescription] = useState(project.description ?? "");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setName(project.name);
    setStartDate(project.startDate);
    setFinishDate(parseProjectDateDisplay(project.finish) ?? "");
    setManager(project.manager);
    setDescription(project.description ?? "");
  }, [project]);

  const handleCancel = () => {
    setStatus(`Returned to ${PROJECT_VIEW_LABELS[returnView]}`, { variant: "info" });
    closeToWorkspace();
  };

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Project name is required.");
      return;
    }
    updateProject(project.id, {
      name: trimmedName,
      startDate,
      finishDate: finishDate || null,
      manager: manager.trim() || "You",
      description: description.trim() || null,
    });
    setStatus("Project information saved", { variant: "success" });
    toast.success(`Returning to ${PROJECT_VIEW_LABELS[returnView]}`);
    closeToWorkspace();
  };

  const confirmArchive = () => {
    archiveProject(project.id);
    setArchiveOpen(false);
    setStatus(`Archived project: ${project.name}`, { variant: "success" });
    toast.success(`Archived "${project.name}"`);
    navigate(viewToPath("projects"));
    closeToWorkspace();
  };

  const confirmDelete = () => {
    const projectName = project.name;
    deleteProject(project.id);
    setDeleteOpen(false);
    setStatus(`Deleted project: ${projectName}`, { variant: "success" });
    toast.success(`Deleted "${projectName}"`);
    navigate(viewToPath("projects"));
    closeToWorkspace();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  return (
    <div className="flex h-full flex-col overflow-auto bg-nest-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Project Information</h1>
            <p className="mt-1 text-sm text-nest-muted">
              Edit project metadata. Changes persist to PostgreSQL when running in
              the desktop shell.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-nest-sm p-1.5 text-nest-muted hover:bg-nest-surface hover:text-nest-foreground"
            aria-label="Close"
            title="Close"
          >
            <Icon icon={faXmark} className="size-4" />
          </button>
        </header>

        <form
          className="flex flex-1 flex-col space-y-4 rounded-nest-lg border border-nest-border bg-nest-surface p-6"
          onSubmit={(event) => {
            event.preventDefault();
            handleSave();
          }}
        >
          <label className="block">
            <span className="text-xs font-medium text-nest-muted">Project Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-nest-muted">Start Date</span>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                variant="default"
                className="mt-1 w-full"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-nest-muted">Finish Date</span>
              <DatePicker
                value={finishDate}
                onChange={setFinishDate}
                min={startDate || undefined}
                variant="default"
                className="mt-1 w-full"
                placeholder="No finish date"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-nest-muted">Manager</span>
            <input
              value={manager}
              onChange={(event) => setManager(event.target.value)}
              className="mt-1 w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyRow label="Status Date" value={formatProjectDate(new Date().toISOString().slice(0, 10))} />
            <ReadOnlyRow label="Calendar" value="Standard (Mon–Fri, 8h)" />
          </div>

          <label className="block">
            <span className="text-xs font-medium text-nest-muted">Comments</span>
            <textarea
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
            />
          </label>

          <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-nest-border pt-4">
            <div className="flex flex-wrap gap-2">
              {!project.archived ? (
                <button
                  type="button"
                  onClick={() => setArchiveOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-nest-md border border-nest-border px-3 py-2 text-sm text-nest-muted hover:bg-nest-background hover:text-nest-foreground"
                >
                  <Icon icon={faBoxArchive} className="size-3.5" />
                  Archive
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-nest-md border border-nest-error/40 px-3 py-2 text-sm text-nest-error hover:bg-nest-error/10"
              >
                <Icon icon={faTrash} className="size-3.5" />
                Delete
              </button>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-nest-md border border-nest-border px-4 py-2 text-sm text-nest-foreground hover:bg-nest-background"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-nest-md bg-nest-primary px-4 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
              >
                OK
              </button>
            </div>
          </footer>
        </form>
      </div>

      <ConfirmDialog
        open={archiveOpen}
        title="Archive Project"
        icon={faBoxArchive}
        confirmLabel="Archive"
        message={`Archive "${project.name}"?\n\nAll tasks will be marked 100% complete and the project will be hidden from the default Project Center list. Tasks and knowledge are retained.`}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Project"
        icon={faTrash}
        confirmLabel="Delete"
        danger
        message={`Permanently delete "${project.name}"?\n\nThis removes all tasks, knowledge, and links for this project. This cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-nest-muted">{label}</span>
      <input
        readOnly
        value={value}
        className="mt-1 w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm text-nest-muted"
      />
    </label>
  );
}
