import { useEffect, useId, useState, type FormEvent } from "react";
import { faFolderClosed, faXmark } from "../../lib/fontawesome";
import { Icon } from "../Icon";
import { useMockKnowledge } from "../../context/MockKnowledgeContext";
import { useStatusBar } from "../../context/StatusBarContext";
import { useToast } from "../../context/ToastContext";

export function NewKnowledgeCategoryForm() {
  const titleId = useId();
  const { newCategoryOpen, closeNewCategory, createCategory } = useMockKnowledge();
  const { setStatus } = useStatusBar();
  const toast = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!newCategoryOpen) {
      return;
    }
    setName("");
    setDescription("");
    setError(null);
  }, [newCategoryOpen]);

  useEffect(() => {
    if (!newCategoryOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNewCategory();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [newCategoryOpen, closeNewCategory]);

  if (!newCategoryOpen) {
    return null;
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Category name is required.");
      toast.error("Category name is required.");
      return;
    }
    const category = createCategory({ name: trimmed, description });
    setStatus(`Created category: ${category.name}`, { variant: "success" });
    toast.success(`Created category "${category.name}"`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={closeNewCategory}
      role="presentation"
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md overflow-hidden rounded-nest-lg border border-nest-border bg-nest-surface shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="flex items-center justify-between border-b border-nest-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Icon icon={faFolderClosed} className="size-4 text-nest-primary" />
            <h2 id={titleId} className="text-sm font-semibold">
              New Category
            </h2>
          </div>
          <button
            type="button"
            onClick={closeNewCategory}
            className="rounded-nest-sm p-1 text-nest-muted hover:bg-nest-muted/10"
            aria-label="Close"
          >
            <Icon icon={faXmark} className="size-3.5" />
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          {error ? <p className="text-sm text-nest-error">{error}</p> : null}
          <label className="block text-sm">
            <span className="mb-1 block text-nest-muted">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-nest-muted">Description (optional)</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-nest-md border border-nest-border bg-nest-background px-3 py-2"
            />
          </label>
        </div>

        <footer className="flex justify-end gap-2 border-t border-nest-border px-5 py-3">
          <button
            type="button"
            onClick={closeNewCategory}
            className="rounded-nest-md border border-nest-border px-4 py-2 text-sm hover:bg-nest-muted/10"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-nest-md bg-nest-primary px-4 py-2 text-sm font-medium text-white hover:bg-nest-secondary"
          >
            Create
          </button>
        </footer>
      </form>
    </div>
  );
}
