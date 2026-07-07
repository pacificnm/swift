import { useEffect, useId, useRef, useState } from "react";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faComment,
  faEnvelope,
  faFileLines,
  faLink,
  faNoteSticky,
} from "../../lib/fontawesome";
import { Icon } from "../Icon";
import {
  formatKnowledgeDate,
  sourceTypeLabel,
  type KnowledgeSourceType,
  type MockKnowledgeArticle,
  type MockKnowledgeCategory,
  type MockKnowledgeRevision,
} from "../../mock/knowledgeDemo";
import { useMockKnowledge } from "../../context/MockKnowledgeContext";
import { useMockProject } from "../../context/MockProjectContext";

const SOURCE_ICON: Record<KnowledgeSourceType, IconDefinition> = {
  manual: faNoteSticky,
  doc: faFileLines,
  email: faEnvelope,
  slack: faComment,
  url: faLink,
};

type DetailTab = "content" | "revisions" | "source";

export function KnowledgeView() {
  const { project } = useMockProject();
  const {
    categories,
    articles,
    filteredArticles,
    selectedCategoryId,
    selectedArticle,
    selectedRevisionId,
    searchQuery,
    setSelectedCategoryId,
    setSelectedArticleId,
    setSelectedRevisionId,
    setSearchQuery,
    focusSearchRequest,
  } = useMockKnowledge();
  const searchRef = useRef<HTMLInputElement>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("content");

  useEffect(() => {
    if (focusSearchRequest > 0) {
      searchRef.current?.focus();
    }
  }, [focusSearchRequest]);

  useEffect(() => {
    setDetailTab("content");
  }, [selectedArticle?.id]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const activeRevision = selectedArticle
    ? selectedArticle.revisions.find((r) => r.id === selectedRevisionId) ??
      selectedArticle.revisions[selectedArticle.revisions.length - 1]
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-nest-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-nest-border bg-nest-surface px-4 py-2">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold text-nest-foreground">Knowledge Base</h1>
          <p className="text-xs text-nest-muted">
            {project.name} · {articles.length} articles · pgvector index (mock)
          </p>
        </div>
        <div className="ml-auto w-full max-w-md">
          <input
            ref={searchRef}
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search articles (keyword — vector search in phase 3)…"
            className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 text-sm"
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <CategorySidebar
          categories={categories}
          articles={articles}
          selectedCategoryId={selectedCategoryId}
          onSelect={setSelectedCategoryId}
        />

        <ArticleList
          articles={filteredArticles}
          categoryById={categoryById}
          selectedArticleId={selectedArticle?.id ?? null}
          onSelect={setSelectedArticleId}
        />

        <ArticleDetail
          article={selectedArticle}
          category={selectedArticle ? categoryById.get(selectedArticle.categoryId) : undefined}
          tab={detailTab}
          onTabChange={setDetailTab}
          activeRevision={activeRevision}
          selectedRevisionId={selectedRevisionId}
          onSelectRevision={setSelectedRevisionId}
        />
      </div>
    </div>
  );
}

function CategorySidebar({
  categories,
  articles,
  selectedCategoryId,
  onSelect,
}: {
  categories: MockKnowledgeCategory[];
  articles: MockKnowledgeArticle[];
  selectedCategoryId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const countFor = (categoryId: string | null) =>
    categoryId
      ? articles.filter((a) => a.categoryId === categoryId).length
      : articles.length;

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-nest-border bg-nest-surface">
      <p className="border-b border-nest-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-nest-muted">
        Categories
      </p>
      <nav className="min-h-0 flex-1 overflow-auto p-2">
        <CategoryButton
          label="All articles"
          count={countFor(null)}
          active={selectedCategoryId === null}
          onClick={() => onSelect(null)}
        />
        {categories.map((category) => (
          <CategoryButton
            key={category.id}
            label={category.name}
            count={countFor(category.id)}
            active={selectedCategoryId === category.id}
            onClick={() => onSelect(category.id)}
            description={category.description}
          />
        ))}
      </nav>
    </aside>
  );
}

function CategoryButton({
  label,
  count,
  active,
  onClick,
  description,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      title={description}
      onClick={onClick}
      className={[
        "mb-0.5 flex w-full items-center justify-between rounded-nest-sm px-2 py-1.5 text-left text-sm",
        active
          ? "bg-nest-primary/15 font-medium text-nest-primary"
          : "text-nest-foreground hover:bg-nest-muted/10",
      ].join(" ")}
    >
      <span className="truncate">{label}</span>
      <span className="ml-2 shrink-0 text-xs text-nest-muted">{count}</span>
    </button>
  );
}

function ArticleList({
  articles,
  categoryById,
  selectedArticleId,
  onSelect,
}: {
  articles: MockKnowledgeArticle[];
  categoryById: Map<string, MockKnowledgeCategory>;
  selectedArticleId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="flex w-72 shrink-0 flex-col border-r border-nest-border bg-nest-surface">
      <p className="border-b border-nest-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-nest-muted">
        Articles
      </p>
      <ul className="min-h-0 flex-1 overflow-auto">
        {articles.length === 0 ? (
          <li className="px-3 py-6 text-center text-sm text-nest-muted">
            No articles match this filter.
          </li>
        ) : (
          articles.map((article) => (
            <li key={article.id}>
              <button
                type="button"
                onClick={() => onSelect(article.id)}
                className={[
                  "flex w-full gap-2 border-b border-nest-border/60 px-3 py-2.5 text-left transition-colors",
                  selectedArticleId === article.id
                    ? "bg-nest-primary/10"
                    : "hover:bg-nest-muted/5",
                ].join(" ")}
              >
                <Icon
                  icon={SOURCE_ICON[article.sourceType]}
                  className="mt-0.5 size-3.5 shrink-0 text-nest-primary"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{article.title}</p>
                  <p className="truncate text-xs text-nest-muted">
                    {categoryById.get(article.categoryId)?.name ?? "Uncategorized"}
                  </p>
                  <p className="mt-0.5 text-[10px] text-nest-muted">
                    {formatKnowledgeDate(article.updatedAt)} · {article.revisions.length}{" "}
                    rev{article.revisions.length === 1 ? "" : "s"}
                    {article.indexedAt
                      ? ` · indexed ${formatKnowledgeDate(article.indexedAt)}`
                      : " · not indexed"}
                  </p>
                </div>
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function ArticleDetail({
  article,
  category,
  tab,
  onTabChange,
  activeRevision,
  selectedRevisionId,
  onSelectRevision,
}: {
  article: MockKnowledgeArticle | null;
  category: MockKnowledgeCategory | undefined;
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  activeRevision: MockKnowledgeRevision | null;
  selectedRevisionId: string | null;
  onSelectRevision: (id: string) => void;
}) {
  const titleId = useId();

  if (!article) {
    return (
      <section className="flex min-w-0 flex-1 items-center justify-center p-8 text-sm text-nest-muted">
        Select an article to view content, revisions, and source metadata.
      </section>
    );
  }

  const displayBody =
    tab === "revisions" && activeRevision ? activeRevision.body : article.body;
  const displayTitle =
    tab === "revisions" && activeRevision ? activeRevision.title : article.title;

  return (
    <section className="flex min-w-0 flex-1 flex-col" aria-labelledby={titleId}>
      <header className="shrink-0 border-b border-nest-border bg-nest-surface px-4 py-3">
        <h2 id={titleId} className="text-base font-semibold text-nest-foreground">
          {displayTitle}
        </h2>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-4">
          <Meta label="Category" value={category?.name ?? "—"} />
          <Meta label="Source" value={sourceTypeLabel(article.sourceType)} />
          <Meta label="Created" value={formatKnowledgeDate(article.createdAt)} />
          <Meta label="Updated" value={formatKnowledgeDate(article.updatedAt)} />
        </dl>
        <div className="mt-3 flex gap-1">
          {(["content", "revisions", "source"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange(t)}
              className={[
                "rounded-nest-sm px-2.5 py-1 text-xs font-medium capitalize",
                tab === t
                  ? "bg-nest-primary text-white"
                  : "text-nest-muted hover:bg-nest-muted/10",
              ].join(" ")}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {tab === "content" ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-nest-foreground">
            {article.body}
          </pre>
        ) : null}

        {tab === "revisions" ? (
          <div className="flex min-h-0 gap-4">
            <ol className="w-56 shrink-0 space-y-1 border-r border-nest-border pr-3">
              {[...article.revisions].reverse().map((revision) => (
                <li key={revision.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRevision(revision.id)}
                    className={[
                      "w-full rounded-nest-sm px-2 py-1.5 text-left text-xs",
                      (selectedRevisionId ?? activeRevision?.id) === revision.id
                        ? "bg-nest-primary/15 font-medium text-nest-primary"
                        : "hover:bg-nest-muted/10",
                    ].join(" ")}
                  >
                    <span className="block">Rev {revision.revisionNumber}</span>
                    <span className="block text-nest-muted">
                      {formatKnowledgeDate(revision.createdAt)} · {revision.createdBy}
                    </span>
                    {revision.changeNote ? (
                      <span className="mt-0.5 block truncate text-nest-muted">
                        {revision.changeNote}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ol>
            <div className="min-w-0 flex-1">
              {activeRevision ? (
                <>
                  <p className="mb-2 text-xs text-nest-muted">
                    Revision {activeRevision.revisionNumber}
                    {activeRevision.changeNote ? ` — ${activeRevision.changeNote}` : ""}
                  </p>
                  <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-nest-foreground">
                    {displayBody}
                  </pre>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "source" ? (
          <dl className="max-w-lg space-y-3 text-sm">
            <SourceRow label="Type" value={sourceTypeLabel(article.sourceType)} />
            <SourceRow label="Label" value={article.sourceLabel} />
            <SourceRow label="URI" value={article.sourceUri ?? "—"} mono />
            <SourceRow
              label="Vector index"
              value={
                article.indexedAt
                  ? `Embedded ${formatKnowledgeDate(article.indexedAt)}`
                  : "Pending — save will enqueue pgvector embedding"
              }
            />
            <SourceRow label="Revisions" value={String(article.revisions.length)} />
          </dl>
        ) : null}
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-nest-muted">{label}</dt>
      <dd className="truncate text-nest-foreground">{value}</dd>
    </>
  );
}

function SourceRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-nest-muted">{label}</dt>
      <dd className={["mt-0.5 text-nest-foreground", mono ? "font-mono text-xs break-all" : ""].join(" ")}>
        {value}
      </dd>
    </div>
  );
}
