-- Projects (MockProject in demo.ts, Project Info / New Project forms)
CREATE TABLE projects (
    id UUID PRIMARY KEY,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#64748b',
    icon TEXT,
    manager TEXT,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    percent_complete SMALLINT NOT NULL DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100),
    start_date DATE,
    finish_date DATE,
    status_date DATE,
    priority TEXT NOT NULL DEFAULT 'Normal',
    calendar_id UUID REFERENCES calendars (id) ON DELETE SET NULL
        DEFAULT '00000000-0000-4000-8000-000000000001',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX projects_slug_active_idx ON projects (slug) WHERE NOT archived;
CREATE INDEX projects_library_idx ON projects (archived, pinned DESC, sort_order);
CREATE INDEX projects_manager_idx ON projects (manager) WHERE manager IS NOT NULL;
