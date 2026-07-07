/**
 * Generates seed.sql for the Swift database from the UI mock data.
 * Run: npx tsx apps/swift/crates/swift-data/seed/generate-seed.mts > apps/swift/crates/swift-data/seed/seed.sql
 *
 * Keeps the seeded rows faithful to ui/src/mock/*.ts so the DB mirrors the mockup.
 */
import { randomUUID } from "node:crypto";
import {
  MOCK_PROJECTS,
  buildInitialTasksByProject,
  parseTaskDateDisplay,
  parseTaskDuration,
  parsePredecessorIds,
  type MockTask,
} from "../../../ui/src/mock/demo.ts";
import {
  buildInitialCategoriesByProject,
  buildInitialArticlesByProject,
} from "../../../ui/src/mock/knowledgeDemo.ts";

// Stable UUID per mock string id, resolved at generation time.
const idMap = new Map<string, string>();
function uid(mockId: string): string {
  let v = idMap.get(mockId);
  if (!v) {
    v = randomUUID();
    idMap.set(mockId, v);
  }
  return v;
}

function q(value: string | null | undefined): string {
  if (value === null || value === undefined) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function d(iso: string | null | undefined): string {
  return iso ? `'${iso}'` : "NULL";
}

/** Best-effort parse of human project finish strings ("Jan 15, 2027", "Mar 2026"). */
function parseHumanDate(text: string): string | null {
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

const out: string[] = [];
out.push("-- Swift seed data — generated from ui/src/mock/*.ts");
out.push("-- Regenerate: npx tsx crates/swift-data/seed/generate-seed.mts > crates/swift-data/seed/seed.sql");
out.push("BEGIN;");
out.push(
  "TRUNCATE task_knowledge_links, knowledge_revisions, knowledge_articles, " +
    "knowledge_categories, task_links, tasks, projects RESTART IDENTITY CASCADE;",
);

// Projects
out.push("\n-- projects");
MOCK_PROJECTS.forEach((p, i) => {
  out.push(
    `INSERT INTO projects (id, slug, name, description, color, manager, archived, pinned, ` +
      `percent_complete, start_date, finish_date, sort_order) VALUES (` +
      `${q(uid(p.id))}, ${q(p.slug)}, ${q(p.name)}, ${q(p.description ?? null)}, ${q(p.color)}, ` +
      `${q(p.manager)}, ${p.archived}, ${p.pinned}, ${p.percentComplete}, ` +
      `${d(p.startDate)}, ${d(parseHumanDate(p.finish))}, ${i});`,
  );
});

// Tasks + task_links
const tasksByProject = buildInitialTasksByProject();
out.push("\n-- tasks");
const linkRows: string[] = [];
for (const [projectId, tasks] of Object.entries(tasksByProject)) {
  tasks.forEach((t: MockTask, index) => {
    const startIso = parseTaskDateDisplay(t.start);
    const finishIso = parseTaskDateDisplay(t.finish);
    const durationDays = parseTaskDuration(t.duration);
    out.push(
      `INSERT INTO tasks (id, project_id, outline_level, is_summary, is_milestone, title, notes, ` +
        `duration_days, start_date, finish_date, percent_complete, resource_names, sort_order) VALUES (` +
        `${q(uid(t.id))}, ${q(uid(projectId))}, ${t.outlineLevel}, ${t.isSummary}, ${t.isMilestone}, ` +
        `${q(t.name)}, ${q(t.notes ?? null)}, ${durationDays}, ${d(startIso)}, ${d(finishIso)}, ` +
        `${t.percentComplete}, ${q(t.resources ?? "")}, ${index});`,
    );
    // predecessors reference sibling task ids within the same project set
    const predRowIds = parsePredecessorIds(t.predecessors);
    for (const predRowId of predRowIds) {
      // resolve the sibling task's mock id inside this project
      const sibling = tasks.find(
        (s) => s.id === predRowId || s.id.endsWith(`-${predRowId}`),
      );
      if (sibling) {
        linkRows.push(
          `INSERT INTO task_links (project_id, predecessor_id, successor_id, link_type) VALUES (` +
            `${q(uid(projectId))}, ${q(uid(sibling.id))}, ${q(uid(t.id))}, 'FS');`,
        );
      }
    }
  });
}
out.push("\n-- task_links (predecessors)");
out.push(...linkRows);

// Knowledge categories
out.push("\n-- knowledge_categories");
const categoriesByProject = buildInitialCategoriesByProject();
for (const cats of Object.values(categoriesByProject)) {
  for (const c of cats) {
    out.push(
      `INSERT INTO knowledge_categories (id, project_id, name, description, sort_order) VALUES (` +
        `${q(uid(c.id))}, ${q(uid(c.projectId))}, ${q(c.name)}, ${q(c.description ?? null)}, ${c.sortOrder});`,
    );
  }
}

// Knowledge articles + revisions
out.push("\n-- knowledge_articles");
const revisionRows: string[] = [];
const articlesByProject = buildInitialArticlesByProject();
for (const articles of Object.values(articlesByProject)) {
  for (const a of articles) {
    out.push(
      `INSERT INTO knowledge_articles (id, project_id, category_id, title, body, source_type, ` +
        `source_label, source_uri, created_at, updated_at, indexed_at) VALUES (` +
        `${q(uid(a.id))}, ${q(uid(a.projectId))}, ${q(uid(a.categoryId))}, ${q(a.title)}, ${q(a.body)}, ` +
        `${q(a.sourceType)}, ${q(a.sourceLabel)}, ${q(a.sourceUri ?? null)}, ` +
        `${d(a.createdAt)}, ${d(a.updatedAt)}, ${d(a.indexedAt ?? null)});`,
    );
    for (const r of a.revisions) {
      revisionRows.push(
        `INSERT INTO knowledge_revisions (id, article_id, revision_number, title, body, change_note, ` +
          `created_by, created_at) VALUES (` +
          `${q(uid(r.id))}, ${q(uid(a.id))}, ${r.revisionNumber}, ${q(r.title)}, ${q(r.body)}, ` +
          `${q(r.changeNote ?? null)}, ${q(r.createdBy)}, ${d(r.createdAt)});`,
      );
    }
  }
}
out.push("\n-- knowledge_revisions");
out.push(...revisionRows);

out.push("\nCOMMIT;");
process.stdout.write(out.join("\n") + "\n");
