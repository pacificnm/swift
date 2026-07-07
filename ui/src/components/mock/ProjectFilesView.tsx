import { useEffect, useState } from "react";
import {
  faFileCirclePlus,
  faFileLines,
  faFolderOpen,
  faTrash,
  faXmark,
} from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { useMockFiles } from "../../context/MockFilesContext";
import { useMockProject } from "../../context/MockProjectContext";
import { useProjectView } from "../../context/ProjectViewContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";
import { hasSwiftData } from "../../lib/swift";
import {
  fileTypeLabel,
  formatAddedDate,
  formatFileSize,
} from "../../mock/filesDemo";

export function ProjectFilesView() {
  const { project } = useMockProject();
  const { files, loading, rootMissing, deleteFile, openFile } = useMockFiles();
  const { setView } = useProjectView();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const noProject = !project.id;

  const handleOpen = async (id: string) => {
    const result = await openFile(id);
    if (!result.ok) {
      toast.error(result.message);
      setStatus(result.message, { variant: "error" });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Remove "${title}"? This deletes the copied file.`)) {
      return;
    }
    const result = await deleteFile(id);
    if (result.ok) {
      toast.success(result.message);
      setStatus(result.message, { variant: "success" });
    } else {
      toast.error(result.message);
      setStatus(result.message, { variant: "error" });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-nest-background">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-nest-border bg-nest-surface px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Project Files</h1>
          <p className="mt-1 text-sm text-nest-muted">
            Files for <span className="font-medium">{project.name}</span>
            {files.length > 0 ? ` — ${files.length} file${files.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          disabled={noProject}
          className="inline-flex items-center gap-2 rounded-nest-md bg-nest-primary px-4 py-2 text-sm font-medium text-white hover:bg-nest-secondary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Icon icon={faFileCirclePlus} className="size-4" />
          Add File
        </button>
      </header>

      {rootMissing ? (
        <div className="flex items-center justify-between gap-4 border-b border-nest-border bg-nest-warning/10 px-6 py-3 text-sm text-nest-foreground">
          <span>
            The project files location is not set. Choose a root folder so files can be stored.
          </span>
          <button
            type="button"
            onClick={() => setView("app-settings")}
            className="shrink-0 rounded-nest-sm border border-nest-border bg-nest-surface px-3 py-1.5 text-xs font-medium hover:bg-nest-primary/10"
          >
            Open Settings
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
        {noProject ? (
          <EmptyState message="Create or open a project to attach files." />
        ) : loading ? (
          <EmptyState message="Loading files…" />
        ) : files.length === 0 ? (
          <EmptyState message="No files yet. Use “Add File” to attach one." />
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-nest-border text-left text-xs uppercase tracking-wide text-nest-muted">
                <th className="px-3 py-2 font-medium">Date added</th>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">File name</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Size</th>
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr
                  key={file.id}
                  className="border-b border-nest-border/70 hover:bg-nest-surface/60"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-nest-muted">
                    {formatAddedDate(file.addedAt)}
                  </td>
                  <td className="px-3 py-2 font-medium text-nest-foreground">
                    {file.title}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => handleOpen(file.id)}
                      className="inline-flex items-center gap-1.5 text-nest-primary hover:underline"
                      title="Open with default application"
                    >
                      <Icon icon={faFileLines} className="size-3.5" />
                      {file.fileName}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded-nest-sm bg-nest-muted/15 px-1.5 py-0.5 text-[10px] font-medium text-nest-muted">
                      {fileTypeLabel(file.fileType)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-nest-muted">
                    {formatFileSize(file.sizeBytes)}
                  </td>
                  <td className="px-3 py-2 text-nest-muted">
                    {file.description ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(file.id, file.title)}
                      className="rounded-nest-sm p-1.5 text-nest-muted hover:bg-nest-error/10 hover:text-nest-error"
                      aria-label={`Remove ${file.title}`}
                    >
                      <Icon icon={faTrash} className="size-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {addOpen ? <AddFileModal onClose={() => setAddOpen(false)} /> : null}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-nest-muted">
      <Icon icon={faFolderOpen} className="size-8 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function AddFileModal({ onClose }: { onClose: () => void }) {
  const { choosePath, addFile } = useMockFiles();
  const { setStatus } = useStatusBar();
  const toast = useToast();

  const [source, setSource] = useState<{
    path: string;
    fileName: string;
    fileType: string;
    sizeBytes: number;
  } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleChoose = async () => {
    const picked = await choosePath();
    if (picked) {
      setSource(picked);
      setTitle((prev) => prev || picked.fileName);
    }
  };

  const handleSave = async () => {
    if (!source) {
      return;
    }
    setSaving(true);
    const result = await addFile({
      sourcePath: source.path,
      title,
      description,
    });
    setSaving(false);
    if (result.ok) {
      toast.success(result.message);
      setStatus(result.message, { variant: "success" });
      onClose();
    } else {
      toast.error(result.message);
      setStatus(result.message, { variant: "error" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-nest-lg border border-nest-border bg-nest-surface shadow-lg">
        <header className="flex items-center justify-between border-b border-nest-border px-5 py-3">
          <h2 className="text-sm font-semibold">Add File</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-nest-sm p-1.5 text-nest-muted hover:bg-nest-muted/10 hover:text-nest-foreground"
            aria-label="Close"
          >
            <Icon icon={faXmark} className="size-4" />
          </button>
        </header>

        <form
          className="space-y-4 px-5 py-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
        >
          <div>
            <span className="mb-1 block text-sm font-medium">File</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleChoose}
                disabled={!hasSwiftData()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-nest-md border border-nest-border px-3 py-2 text-sm hover:bg-nest-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Icon icon={faFileCirclePlus} className="size-3.5" />
                Choose file…
              </button>
              <span className="min-w-0 flex-1 truncate text-sm text-nest-muted">
                {source
                  ? `${source.fileName} (${formatFileSize(source.sizeBytes)})`
                  : hasSwiftData()
                    ? "No file selected"
                    : "Available in the desktop app"}
              </span>
            </div>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Display title"
              className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block font-medium">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Optional notes about this file"
              className="w-full resize-none rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-nest-md border border-nest-border px-4 py-2 text-sm hover:bg-nest-muted/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!source || saving}
              className="rounded-nest-md bg-nest-primary px-5 py-2 text-sm font-medium text-white hover:bg-nest-secondary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Adding…" : "Add File"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
