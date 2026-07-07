-- Knowledge base (knowledgeDemo.ts — categories, articles, revisions)
CREATE TABLE knowledge_categories (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, name)
);

CREATE INDEX knowledge_categories_project_sort_idx
    ON knowledge_categories (project_id, sort_order);

CREATE TABLE knowledge_articles (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES knowledge_categories (id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    source_type TEXT NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('manual', 'doc', 'email', 'slack', 'url')),
    source_label TEXT NOT NULL DEFAULT '',
    source_uri TEXT,
    embedding vector(768),
    search_text tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A')
        || setweight(to_tsvector('english', coalesce(body, '')), 'B')
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    indexed_at TIMESTAMPTZ
);

CREATE INDEX knowledge_articles_project_category_idx
    ON knowledge_articles (project_id, category_id);
CREATE INDEX knowledge_articles_project_updated_idx
    ON knowledge_articles (project_id, updated_at DESC);
CREATE INDEX knowledge_articles_search_text_idx
    ON knowledge_articles USING gin (search_text);
CREATE INDEX knowledge_articles_embedding_idx
    ON knowledge_articles USING hnsw (embedding vector_cosine_ops);

CREATE TABLE knowledge_revisions (
    id UUID PRIMARY KEY,
    article_id UUID NOT NULL REFERENCES knowledge_articles (id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL CHECK (revision_number > 0),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    change_note TEXT,
    created_by TEXT NOT NULL DEFAULT 'You',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (article_id, revision_number)
);

CREATE INDEX knowledge_revisions_article_idx
    ON knowledge_revisions (article_id, revision_number DESC);

-- Optional task ↔ knowledge links (task_notes in data-model)
CREATE TABLE task_knowledge_links (
    task_id UUID NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES knowledge_articles (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (task_id, article_id)
);

CREATE INDEX task_knowledge_links_article_idx ON task_knowledge_links (article_id);
