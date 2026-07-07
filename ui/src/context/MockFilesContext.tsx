import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMockProject } from "./MockProjectContext";
import {
  addProjectFile as apiAddFile,
  deleteProjectFile as apiDeleteFile,
  hasSwiftData,
  listProjectFiles,
  openProjectFile as apiOpenFile,
  pickFile,
} from "../lib/swift";
import { dbFileToMock, dbFilesToMock } from "../lib/swiftAdapters";
import {
  buildMockFilesByProject,
  type MockProjectFile,
  type NewProjectFileInput,
} from "../mock/filesDemo";

export type FilesActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

type MockFilesContextValue = {
  files: MockProjectFile[];
  loading: boolean;
  /** True when the project files root is unset (desktop only). */
  rootMissing: boolean;
  /** Opens the native picker; returns the picked source path or null. */
  choosePath: () => Promise<
    { path: string; fileName: string; fileType: string; sizeBytes: number } | null
  >;
  addFile: (input: NewProjectFileInput) => Promise<FilesActionResult>;
  deleteFile: (id: string) => Promise<FilesActionResult>;
  openFile: (id: string) => Promise<FilesActionResult>;
};

const MockFilesContext = createContext<MockFilesContextValue | null>(null);

export function MockFilesProvider({ children }: { children: ReactNode }) {
  const { project } = useMockProject();
  const projectId = project.id;

  const [filesByProject, setFilesByProject] = useState<
    Record<string, MockProjectFile[]>
  >(() => (hasSwiftData() ? {} : buildMockFilesByProject()));
  const [loading, setLoading] = useState(false);
  const [rootMissing, setRootMissing] = useState(false);

  useEffect(() => {
    if (!hasSwiftData() || !projectId) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const rows = await listProjectFiles(projectId);
        if (!cancelled) {
          setFilesByProject((prev) => ({ ...prev, [projectId]: dbFilesToMock(rows) }));
        }
      } catch (error) {
        console.error("Swift: failed to load project files", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const files = useMemo(
    () => filesByProject[projectId] ?? [],
    [filesByProject, projectId],
  );

  const choosePath = useCallback(async () => {
    if (!hasSwiftData()) {
      return null;
    }
    try {
      const picked = await pickFile();
      if (!picked) {
        return null;
      }
      return {
        path: picked.path,
        fileName: picked.file_name,
        fileType: picked.file_type,
        sizeBytes: picked.size_bytes,
      };
    } catch (error) {
      console.error("Swift: file picker failed", error);
      return null;
    }
  }, []);

  const addFile = useCallback(
    async (input: NewProjectFileInput): Promise<FilesActionResult> => {
      if (!projectId) {
        return { ok: false, message: "Create or open a project first." };
      }

      if (!hasSwiftData()) {
        // Browser dev: add a local mock row so the view is explorable.
        const mock: MockProjectFile = {
          id: crypto.randomUUID(),
          projectId,
          title: input.title.trim() || "Untitled file",
          fileName: input.sourcePath.split("/").pop() ?? "file",
          fileType: (input.sourcePath.split(".").pop() ?? "").toLowerCase(),
          description: input.description.trim() || undefined,
          sizeBytes: 0,
          addedAt: new Date().toISOString(),
        };
        setFilesByProject((prev) => ({
          ...prev,
          [projectId]: [mock, ...(prev[projectId] ?? [])],
        }));
        return { ok: true, message: `Added "${mock.title}" (preview).` };
      }

      try {
        const row = await apiAddFile(
          projectId,
          input.sourcePath,
          input.title.trim(),
          input.description.trim() || null,
        );
        const mock = dbFileToMock(row);
        setRootMissing(false);
        setFilesByProject((prev) => ({
          ...prev,
          [projectId]: [mock, ...(prev[projectId] ?? [])],
        }));
        return { ok: true, message: `Added "${mock.title}".` };
      } catch (error) {
        const message = String(error);
        if (message.toLowerCase().includes("files location is not set")) {
          setRootMissing(true);
        }
        return { ok: false, message };
      }
    },
    [projectId],
  );

  const deleteFile = useCallback(
    async (id: string): Promise<FilesActionResult> => {
      const previous = filesByProject[projectId] ?? [];
      const target = previous.find((f) => f.id === id);
      setFilesByProject((prev) => ({
        ...prev,
        [projectId]: (prev[projectId] ?? []).filter((f) => f.id !== id),
      }));

      if (!hasSwiftData()) {
        return { ok: true, message: "Removed file (preview)." };
      }

      try {
        await apiDeleteFile(id);
        return { ok: true, message: `Removed "${target?.title ?? "file"}".` };
      } catch (error) {
        setFilesByProject((prev) => ({ ...prev, [projectId]: previous }));
        return { ok: false, message: String(error) };
      }
    },
    [filesByProject, projectId],
  );

  const openFile = useCallback(async (id: string): Promise<FilesActionResult> => {
    if (!hasSwiftData()) {
      return { ok: false, message: "Opening files requires the desktop app." };
    }
    try {
      await apiOpenFile(id);
      return { ok: true, message: "Opening file…" };
    } catch (error) {
      return { ok: false, message: String(error) };
    }
  }, []);

  const value = useMemo(
    () => ({
      files,
      loading,
      rootMissing,
      choosePath,
      addFile,
      deleteFile,
      openFile,
    }),
    [files, loading, rootMissing, choosePath, addFile, deleteFile, openFile],
  );

  return (
    <MockFilesContext.Provider value={value}>{children}</MockFilesContext.Provider>
  );
}

export function useMockFiles(): MockFilesContextValue {
  const ctx = useContext(MockFilesContext);
  if (!ctx) {
    throw new Error("useMockFiles must be used within MockFilesProvider");
  }
  return ctx;
}
