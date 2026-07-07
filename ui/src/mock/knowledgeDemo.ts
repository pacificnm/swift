import { formatProjectDate } from "./demo";

export type KnowledgeSourceType = "manual" | "doc" | "email" | "slack" | "url";

export type MockKnowledgeCategory = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  sortOrder: number;
};

export type MockKnowledgeRevision = {
  id: string;
  revisionNumber: number;
  title: string;
  body: string;
  createdAt: string;
  createdBy: string;
  changeNote?: string;
};

export type MockKnowledgeArticle = {
  id: string;
  projectId: string;
  categoryId: string;
  title: string;
  body: string;
  sourceType: KnowledgeSourceType;
  sourceLabel: string;
  sourceUri?: string;
  createdAt: string;
  updatedAt: string;
  indexedAt?: string;
  revisions: MockKnowledgeRevision[];
};

export type NewKnowledgeCategoryInput = {
  name: string;
  description?: string;
};

export type NewKnowledgeArticleInput = {
  categoryId: string;
  title: string;
  body: string;
  sourceType: KnowledgeSourceType;
  sourceLabel: string;
  sourceUri?: string;
};

const CREATED = "2026-06-15";
const UPDATED = "2026-07-04";
const INDEXED = "2026-07-05";

const NEST_CATEGORIES: MockKnowledgeCategory[] = [
  {
    id: "kc-arch",
    projectId: "p-nest",
    name: "Architecture",
    description: "Layering, crate boundaries, and platform decisions.",
    sortOrder: 0,
  },
  {
    id: "kc-specs",
    projectId: "p-nest",
    name: "Product Specs",
    description: "Swift feature specs and implementation plans.",
    sortOrder: 1,
  },
  {
    id: "kc-infra",
    projectId: "p-nest",
    name: "Infrastructure",
    description: "Database, Ollama, and deployment notes.",
    sortOrder: 2,
  },
  {
    id: "kc-company",
    projectId: "p-nest",
    name: "Company & Process",
    description: "Internal policies, onboarding, and runbooks.",
    sortOrder: 3,
  },
];

const NEST_ARTICLES: MockKnowledgeArticle[] = [
  {
    id: "ka-pgvector",
    projectId: "p-nest",
    categoryId: "kc-infra",
    title: "PostgreSQL + pgvector setup",
    body: `# PostgreSQL + pgvector

Remote server hosts the Swift database (\`swift\` on server.lan).

## Extension
\`\`\`sql
CREATE EXTENSION IF NOT EXISTS vector;
\`\`\`

## Embedding column
\`knowledge_items.embedding vector(1536)\` — populated by Ollama \`nomic-embed-text\` on save.

## Agent access
The assistant calls \`swift_search_knowledge\` scoped to the active project.`,
    sourceType: "doc",
    sourceLabel: "docs/plan/nest-data-postgres-v1.md",
    sourceUri: "nest://docs/plan/nest-data-postgres-v1.md",
    createdAt: "2026-06-20",
    updatedAt: UPDATED,
    indexedAt: INDEXED,
    revisions: [
      {
        id: "kr-pg-1",
        revisionNumber: 1,
        title: "PostgreSQL + pgvector setup",
        body: "Initial draft: SQLite replaced with PostgreSQL. pgvector extension required.",
        createdAt: "2026-06-20",
        createdBy: "You",
        changeNote: "Created from nest-data-postgres plan",
      },
      {
        id: "kr-pg-2",
        revisionNumber: 2,
        title: "PostgreSQL + pgvector setup",
        body: "Added remote server.lan connection details and swift database name.",
        createdAt: "2026-06-28",
        createdBy: "You",
        changeNote: "Documented remote host",
      },
      {
        id: "kr-pg-3",
        revisionNumber: 3,
        title: "PostgreSQL + pgvector setup",
        body: `# PostgreSQL + pgvector\n\nRemote server hosts the Swift database. Embedding via Ollama nomic-embed-text.`,
        createdAt: UPDATED,
        createdBy: "You",
        changeNote: "Added agent search command reference",
      },
    ],
  },
  {
    id: "ka-knowledge-spec",
    projectId: "p-nest",
    categoryId: "kc-specs",
    title: "Knowledge base requirements",
    body: `# Knowledge base (v1)

Project-scoped articles indexed for **vector search**.

## Required fields
- Category
- Title + body (markdown)
- Source type and label
- Revision history on every save

## Search
- pgvector similarity (primary)
- PostgreSQL tsvector keyword (secondary)
- Hybrid rerank for agent queries`,
    sourceType: "doc",
    sourceLabel: "apps/swift/docs/specs/knowledge.md",
    sourceUri: "nest://apps/swift/docs/specs/knowledge.md",
    createdAt: "2026-07-01",
    updatedAt: "2026-07-06",
    indexedAt: "2026-07-06",
    revisions: [
      {
        id: "kr-ks-1",
        revisionNumber: 1,
        title: "Knowledge base requirements",
        body: "Notes and docs only in v1.",
        createdAt: "2026-07-01",
        createdBy: "You",
        changeNote: "Initial spec import",
      },
      {
        id: "kr-ks-2",
        revisionNumber: 2,
        title: "Knowledge base requirements",
        body: "Added categories, revisions, and source metadata for company info.",
        createdAt: "2026-07-06",
        createdBy: "You",
        changeNote: "Expanded for Knowledge tab mockup",
      },
    ],
  },
  {
    id: "ka-arch-layers",
    projectId: "p-nest",
    categoryId: "kc-arch",
    title: "Nest layering rules",
    body: `# Layer boundaries

- **core** must not depend on modules or apps
- **modules** may depend on core
- **apps** (Swift, Loon) consume modules + core via path patches

See \`docs/architecture.md\` for the dependency diagram.`,
    sourceType: "manual",
    sourceLabel: "Manual note",
    createdAt: CREATED,
    updatedAt: "2026-06-25",
    indexedAt: "2026-06-26",
    revisions: [
      {
        id: "kr-al-1",
        revisionNumber: 1,
        title: "Nest layering rules",
        body: "core → modules → apps. No upward dependencies.",
        createdAt: CREATED,
        createdBy: "You",
      },
    ],
  },
  {
    id: "ka-slack-db",
    projectId: "p-nest",
    categoryId: "kc-infra",
    title: "#nest — database host decision",
    body: `Thread summary (2026-06-18):

> Use server.lan Postgres for Swift + pgvector. Ollama on same host for chat and embeddings.

Action: configure \`config.toml\` \`[database].url\` before swift-data phase.`,
    sourceType: "slack",
    sourceLabel: "#nest on server.lan",
    sourceUri: "slack://nest/C0123456/1718712000",
    createdAt: "2026-06-18",
    updatedAt: "2026-06-18",
    indexedAt: "2026-06-19",
    revisions: [
      {
        id: "kr-sd-1",
        revisionNumber: 1,
        title: "#nest — database host decision",
        body: "Slack thread imported — Postgres + Ollama co-located on server.lan.",
        createdAt: "2026-06-18",
        createdBy: "Import job",
        changeNote: "Auto-ingest from Slack",
      },
    ],
  },
  {
    id: "ka-onboarding",
    projectId: "p-nest",
    categoryId: "kc-company",
    title: "Contributor onboarding checklist",
    body: `# Onboarding

1. Clone nest monorepo
2. Copy \`apps/swift/config.example.toml\` → \`config.toml\`
3. Run \`./scripts/index-memory.sh\` for MCP memory
4. Read \`AGENTS.md\` workflow`,
    sourceType: "manual",
    sourceLabel: "Company runbook",
    createdAt: "2026-05-01",
    updatedAt: "2026-07-02",
    indexedAt: "2026-07-03",
    revisions: [
      {
        id: "kr-ob-1",
        revisionNumber: 1,
        title: "Contributor onboarding checklist",
        body: "Basic clone + config steps.",
        createdAt: "2026-05-01",
        createdBy: "You",
      },
      {
        id: "kr-ob-2",
        revisionNumber: 2,
        title: "Contributor onboarding checklist",
        body: "Added AGENTS.md and MCP memory indexing step.",
        createdAt: "2026-07-02",
        createdBy: "You",
        changeNote: "Agent workflow docs",
      },
    ],
  },
  {
    id: "ka-email-vendor",
    projectId: "p-nest",
    categoryId: "kc-company",
    title: "Vendor SLA — hosting provider",
    body: `From: ops@hosting.example.com
Date: 2026-06-10

99.9% uptime SLA for server.lan VM. Maintenance window Sundays 02:00–04:00 UTC.`,
    sourceType: "email",
    sourceLabel: "ops@hosting.example.com",
    sourceUri: "mailto:ops@hosting.example.com?subject=SLA",
    createdAt: "2026-06-10",
    updatedAt: "2026-06-10",
    indexedAt: "2026-06-11",
    revisions: [
      {
        id: "kr-ev-1",
        revisionNumber: 1,
        title: "Vendor SLA — hosting provider",
        body: "Email import — SLA and maintenance window.",
        createdAt: "2026-06-10",
        createdBy: "Import job",
        changeNote: "IMAP ingest",
      },
    ],
  },
];

const SWIFT_CATEGORIES: MockKnowledgeCategory[] = NEST_CATEGORIES.map((c) => ({
  ...c,
  id: `s-${c.id}`,
  projectId: "p-swift",
}));

const SWIFT_ARTICLES: MockKnowledgeArticle[] = [
  {
    id: "ka-swift-ui",
    projectId: "p-swift",
    categoryId: "s-kc-specs",
    title: "MS Project UI shell",
    body: "Ribbon tabs: File, Task, View, Project, Knowledge, Help. Gantt-first workspace.",
    sourceType: "manual",
    sourceLabel: "Manual note",
    createdAt: "2026-07-07",
    updatedAt: "2026-07-07",
    revisions: [
      {
        id: "kr-ui-1",
        revisionNumber: 1,
        title: "MS Project UI shell",
        body: "Ribbon + Gantt mockup scope.",
        createdAt: "2026-07-07",
        createdBy: "You",
      },
    ],
  },
];

export function formatKnowledgeDate(isoDate: string): string {
  return formatProjectDate(isoDate);
}

export function sourceTypeLabel(type: KnowledgeSourceType): string {
  switch (type) {
    case "manual":
      return "Manual";
    case "doc":
      return "Document";
    case "email":
      return "Email";
    case "slack":
      return "Slack";
    case "url":
      return "Web";
  }
}

export function buildInitialCategoriesByProject(): Record<string, MockKnowledgeCategory[]> {
  return {
    "p-nest": [...NEST_CATEGORIES],
    "p-swift": [...SWIFT_CATEGORIES],
    "p-loon": NEST_CATEGORIES.slice(0, 2).map((c) => ({
      ...c,
      id: `l-${c.id}`,
      projectId: "p-loon",
    })),
  };
}

export function buildInitialArticlesByProject(): Record<string, MockKnowledgeArticle[]> {
  return {
    "p-nest": NEST_ARTICLES.map((article) => ({
      ...article,
      revisions: article.revisions.map((r) => ({ ...r })),
    })),
    "p-swift": SWIFT_ARTICLES.map((article) => ({
      ...article,
      revisions: article.revisions.map((r) => ({ ...r })),
    })),
    "p-loon": [],
  };
}
