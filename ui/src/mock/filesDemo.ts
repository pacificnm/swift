/** Display shape for a project file row (mirrors `DbProjectFile`). */
export type MockProjectFile = {
  id: string;
  projectId: string;
  title: string;
  fileName: string;
  fileType: string;
  description?: string;
  sizeBytes: number;
  /** ISO timestamp the file was added. */
  addedAt: string;
};

/** Input for attaching a new file (paired with a picked source path). */
export type NewProjectFileInput = {
  sourcePath: string;
  title: string;
  description: string;
};

/** Human-readable file size, e.g. `1.2 MB`. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  const value = bytes / 1024 ** exponent;
  const rounded = exponent === 0 ? value : Math.round(value * 10) / 10;
  return `${rounded} ${units[exponent]}`;
}

/** Short date (e.g. `Jul 7, 2026`) for the “Date added” column. */
export function formatAddedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Uppercase type badge (e.g. `PDF`), falling back to `FILE`. */
export function fileTypeLabel(fileType: string): string {
  const trimmed = fileType.trim();
  return trimmed ? trimmed.toUpperCase() : "FILE";
}

/** Browser-only sample rows so the Files view is explorable without Tauri. */
export function buildMockFilesByProject(): Record<string, MockProjectFile[]> {
  return {
    "p-nest": [
      {
        id: "f-nest-1",
        projectId: "p-nest",
        title: "Architecture overview",
        fileName: "architecture.pdf",
        fileType: "pdf",
        description: "System diagram and layering rules.",
        sizeBytes: 248_500,
        addedAt: "2026-07-01T15:00:00Z",
      },
      {
        id: "f-nest-2",
        projectId: "p-nest",
        title: "Kickoff notes",
        fileName: "kickoff.docx",
        fileType: "docx",
        sizeBytes: 41_200,
        addedAt: "2026-07-03T09:30:00Z",
      },
    ],
  };
}
