import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  faBoxArchive,
  faFolderOpen,
  faMagnifyingGlass,
  faPlus,
  faThumbtack,
} from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { useMockProject } from "../../context/MockProjectContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";
import { viewToPath } from "../../context/ProjectViewContext";

export function ProjectCenterView() {
  const { projects, openProject, openNewProject } = useMockProject();
  const navigate = useNavigate();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const filtered = projects.filter((p) => {
    if (!showArchived && p.archived) return false;
    if (!query) return true;
    return p.name.toLowerCase().includes(query.toLowerCase());
  });

  const handleOpen = (id: string, name: string) => {
    openProject(id);
    navigate(viewToPath("gantt"));
    setStatus(`Opened project: ${name}`, { variant: "success" });
    toast.success(`Opened project: ${name}`);
  };

  return (
    <div className="flex h-full flex-col p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Project Center</h1>
          <p className="text-sm text-nest-muted">
            Open a project to work in Gantt Chart view. New projects start with an
            empty schedule.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewProject}
          className="inline-flex items-center gap-1.5 rounded-nest-md bg-nest-primary px-3 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
        >
          <Icon icon={faPlus} className="size-3.5" />
          New Project
        </button>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Icon
            icon={faMagnifyingGlass}
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-nest-muted"
          />
          <input
            type="search"
            placeholder="Search projects…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-nest-md border border-nest-border bg-nest-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-nest-muted">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-nest-md border border-nest-border">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 bg-nest-surface text-left text-xs text-nest-muted">
            <tr className="border-b border-nest-border">
              <th className="px-3 py-2 font-medium">Project Name</th>
              <th className="px-3 py-2 font-medium">% Complete</th>
              <th className="px-3 py-2 font-medium">Finish</th>
              <th className="px-3 py-2 font-medium">Manager</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((project) => (
              <tr
                key={project.id}
                className="border-b border-nest-border/60 hover:bg-nest-muted/5"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                      aria-hidden
                    />
                    <span className="font-medium">{project.name}</span>
                    {project.pinned ? (
                      <Icon
                        icon={faThumbtack}
                        className="size-3 text-nest-primary"
                        title="Pinned"
                      />
                    ) : null}
                    {project.archived ? (
                      <Icon
                        icon={faBoxArchive}
                        className="size-3 text-nest-muted"
                        title="Archived"
                      />
                    ) : null}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-nest-muted/20">
                      <div
                        className="h-full bg-nest-primary"
                        style={{ width: `${project.percentComplete}%` }}
                      />
                    </div>
                    <span className="text-xs text-nest-muted">
                      {project.percentComplete}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-nest-muted">{project.finish}</td>
                <td className="px-3 py-2.5 text-nest-muted">{project.manager}</td>
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => handleOpen(project.id, project.name)}
                    className="inline-flex items-center gap-1 rounded-nest-sm border border-nest-border px-2.5 py-1 text-xs hover:bg-nest-muted/10"
                  >
                    <Icon icon={faFolderOpen} className="size-3.5" />
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
