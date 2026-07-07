import { useEffect, useId, useState, type FormEvent } from "react";
import { faFileLines, faXmark } from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { useMockKnowledge } from "../../context/MockKnowledgeContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";
import {
  sourceTypeLabel,
  type KnowledgeSourceType,
} from "../../mock/knowledgeDemo";

const SOURCE_TYPES: KnowledgeSourceType[] = ["manual", "doc", "email", "slack", "url"];

export function NewKnowledgeArticleForm() {
  const titleId = useId();
  const { newArticleOpen, closeNewArticle, createArticle, categories, selectedCategoryId } =
    useMockKnowledge();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceType, setSourceType] = useState<KnowledgeSourceType>("manual");
  const [sourceLabel, setSourceLabel] = useState("Manual note");
  const [sourceUri, setSourceUri] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!newArticleOpen) {
      return;
    }
    setCategoryId(selectedCategoryId ?? categories[0]?.id ?? "");
    setTitle("");
    setBody("");
    setSourceType("manual");
    setSourceLabel("Manual note");
    setSourceUri("");
    setError(null);
  }, [newArticleOpen, selectedCategoryId, categories]);

  useEffect(() => {
    if (!newArticleOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNewArticle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newArticleOpen, closeNewArticle]);

  if (!newArticleOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!categoryId) {
      setError("Create a category first.");
      toast.error("Create a category first.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      toast.error("Title is required.");
      return;
    }
    if (!body.trim()) {
      setError("Body is required.");
      toast.error("Body is required.");
      return;
    }
    const article = createArticle({
      categoryId,
      title,
      body,
      sourceType,
      sourceLabel,
      sourceUri: sourceUri || undefined,
    });
    setStatus(`Created article: ${article.title}`, { variant: "success" });
    toast.success(`Created "${article.title}" — pending vector index`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={closeNewArticle}
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[min(90vh,42rem)] w-full max-w-2xl flex-col overflow-hidden rounded-nest-lg border border-nest-border bg-nest-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-nest-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Icon icon={faFileLines} className="size-4 text-nest-primary" />
            <h2 id={titleId} className="text-sm font-semibold">
              New Article
            </h2>
          </div>
          <button
            type="button"
            onClick={closeNewArticle}
            className="rounded-nest-sm p-1 text-nest-muted hover:bg-nest-muted/10"
            aria-label="Close"
          >
            <Icon icon={faXmark} className="size-3.5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-auto px-5 py-4">
          {error ? <p className="text-sm text-nest-error">{error}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-nest-muted">Category</span>
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2"
              >
                {categories.length === 0 ? (
                  <option value="">No categories</option>
                ) : (
                  categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-nest-muted">Title</span>
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-nest-muted">Source type</span>
              <select
                value={sourceType}
                onChange={(event) => {
                  const next = event.target.value as KnowledgeSourceType;
                  setSourceType(next);
                  if (next === "manual") {
                    setSourceLabel("Manual note");
                  }
                }}
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2"
              >
                {SOURCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {sourceTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-nest-muted">Source label</span>
              <input
                value={sourceLabel}
                onChange={(event) => setSourceLabel(event.target.value)}
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-nest-muted">Source URI (optional)</span>
              <input
                value={sourceUri}
                onChange={(event) => setSourceUri(event.target.value)}
                placeholder="doc path, email, Slack link…"
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 font-mono text-xs"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-nest-muted">Body (markdown)</span>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={10}
                className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2 font-mono text-sm"
              />
            </label>
          </div>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-nest-border px-5 py-3">
          <button
            type="button"
            onClick={closeNewArticle}
            className="rounded-nest-md border border-nest-border px-4 py-2 text-sm hover:bg-nest-muted/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-nest-md bg-nest-primary px-4 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
          >
            Create article
          </button>
        </footer>
      </form>
    </div>
  );
}
