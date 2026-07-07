-- Tasks (MockTask in demo.ts, Task form / Gantt)
CREATE TABLE tasks (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    parent_id UUID REFERENCES tasks (id) ON DELETE SET NULL,
    outline_level SMALLINT NOT NULL DEFAULT 0 CHECK (outline_level >= 0),
    is_summary BOOLEAN NOT NULL DEFAULT FALSE,
    is_milestone BOOLEAN NOT NULL DEFAULT FALSE,
    title TEXT NOT NULL,
    notes TEXT,
    duration_days INTEGER NOT NULL DEFAULT 1 CHECK (duration_days >= 0),
    duration_minutes INTEGER CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
    start_date DATE,
    finish_date DATE,
    percent_complete SMALLINT NOT NULL DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100),
    resource_names TEXT NOT NULL DEFAULT '',
    priority TEXT,
    constraint_type TEXT,
    constraint_date DATE,
    deadline DATE,
    effort_driven BOOLEAN NOT NULL DEFAULT FALSE,
    task_type TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    actual_start DATE,
    actual_finish DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tasks_project_sort_idx ON tasks (project_id, sort_order);
CREATE INDEX tasks_project_outline_idx ON tasks (project_id, outline_level, sort_order);
CREATE INDEX tasks_project_dates_idx ON tasks (project_id, start_date, finish_date);
CREATE INDEX tasks_parent_idx ON tasks (parent_id) WHERE parent_id IS NOT NULL;

-- Predecessor links (normalized from MockTask.predecessors)
CREATE TABLE task_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    predecessor_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    successor_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    link_type TEXT NOT NULL DEFAULT 'FS' CHECK (link_type IN ('FS', 'SS', 'FF', 'SF')),
    lag_minutes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT task_links_distinct CHECK (predecessor_id <> successor_id),
    UNIQUE (predecessor_id, successor_id, link_type)
);

CREATE INDEX task_links_successor_idx ON task_links (successor_id);
CREATE INDEX task_links_project_idx ON task_links (project_id);
