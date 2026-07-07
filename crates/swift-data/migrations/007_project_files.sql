-- Project files (attachments stored under the configured files root, one
-- folder per project). Mirrors ProjectFile in swift-data and MockProjectFile.
CREATE TABLE project_files (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL DEFAULT '',
    description TEXT,
    size_bytes BIGINT NOT NULL DEFAULT 0,
    -- Path of the copied file relative to the configured files root
    -- (e.g. `my-project/report.pdf`), so the root can move without a rewrite.
    stored_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX project_files_project_idx ON project_files (project_id, created_at DESC);
