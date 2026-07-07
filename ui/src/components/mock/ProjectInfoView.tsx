import { useEffect } from "react";
import { faXmark } from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { useMockProject } from "../../context/MockProjectContext";
import { useProjectView, PROJECT_VIEW_LABELS } from "../../context/ProjectViewContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";
import { formatProjectDate } from "../../mock/demo";

export function ProjectInfoView() {
  const { project } = useMockProject();
  const { returnView, closeToWorkspace } = useProjectView();
  const { setStatus } = useStatusBar();
  const toast = useToast();

  const handleOk = () => {
    setStatus(`Project information saved (mock)`, { variant: "success" });
    toast.success(`Returning to ${PROJECT_VIEW_LABELS[returnView]}`);
    closeToWorkspace();
  };

  const handleCancel = () => {
    setStatus(`Returned to ${PROJECT_VIEW_LABELS[returnView]}`, { variant: "info" });
    closeToWorkspace();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setStatus(`Returned to ${PROJECT_VIEW_LABELS[returnView]}`, { variant: "info" });
        closeToWorkspace();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeToWorkspace, returnView, setStatus]);

  return (
    <div className="flex h-full flex-col overflow-auto bg-nest-background">
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col p-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold">Project Information</h1>
            <p className="mt-1 text-sm text-nest-muted">
              Mock dialog — same fields as Microsoft Project → Project Information.
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
            handleOk();
          }}
        >
          <FormRow label="Project Name" value={project.name} />
          <FormRow label="Start Date" value={formatProjectDate(project.startDate)} />
          <FormRow label="Finish Date" value={project.finish} />
          <FormRow label="Status Date" value="Monday, July 7, 2026" />
          <FormRow label="Calendar" value="Standard (Mon–Fri, 8h)" />
          <FormRow label="Priority" value="Normal" />
          <label className="block">
            <span className="text-xs font-medium text-nest-muted">Comments</span>
            <textarea
              readOnly
              rows={4}
              className="mt-1 w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
              defaultValue={
                project.description ??
                "Personal Nest framework workstream. Remote Postgres on server.lan."
              }
            />
          </label>

          <footer className="mt-auto flex justify-end gap-2 border-t border-nest-border pt-4">
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
          </footer>
        </form>
      </div>
    </div>
  );
}

function FormRow({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-nest-muted">{label}</span>
      <input
        readOnly
        value={value}
        className="mt-1 w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
      />
    </label>
  );
}
