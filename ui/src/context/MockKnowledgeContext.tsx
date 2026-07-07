import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMockProject } from "./MockProjectContext";
import {
  buildInitialArticlesByProject,
  buildInitialCategoriesByProject,
  type MockKnowledgeArticle,
  type MockKnowledgeCategory,
  type MockKnowledgeRevision,
  type NewKnowledgeArticleInput,
  type NewKnowledgeCategoryInput,
} from "../mock/knowledgeDemo";

export type KnowledgeActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

type MockKnowledgeContextValue = {
  categories: MockKnowledgeCategory[];
  articles: MockKnowledgeArticle[];
  filteredArticles: MockKnowledgeArticle[];
  selectedCategoryId: string | null;
  selectedArticleId: string | null;
  selectedArticle: MockKnowledgeArticle | null;
  selectedRevisionId: string | null;
  searchQuery: string;
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedArticleId: (id: string | null) => void;
  setSelectedRevisionId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  createCategory: (input: NewKnowledgeCategoryInput) => MockKnowledgeCategory;
  createArticle: (input: NewKnowledgeArticleInput) => MockKnowledgeArticle;
  reindexArticle: (articleId: string) => KnowledgeActionResult;
  newCategoryOpen: boolean;
  newArticleOpen: boolean;
  openNewCategory: () => void;
  closeNewCategory: () => void;
  openNewArticle: () => void;
  closeNewArticle: () => void;
  focusSearchRequest: number;
  requestSearchFocus: () => void;
};

const MockKnowledgeContext = createContext<MockKnowledgeContextValue | null>(null);

function matchesSearch(article: MockKnowledgeArticle, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return (
    article.title.toLowerCase().includes(q) ||
    article.body.toLowerCase().includes(q) ||
    article.sourceLabel.toLowerCase().includes(q)
  );
}

export function MockKnowledgeProvider({ children }: { children: ReactNode }) {
  const { project } = useMockProject();
  const [categoriesByProject, setCategoriesByProject] = useState<
    Record<string, MockKnowledgeCategory[]>
  >(buildInitialCategoriesByProject);
  const [articlesByProject, setArticlesByProject] = useState<
    Record<string, MockKnowledgeArticle[]>
  >(buildInitialArticlesByProject);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newArticleOpen, setNewArticleOpen] = useState(false);
  const [focusSearchRequest, setFocusSearchRequest] = useState(0);

  const openNewCategory = useCallback(() => setNewCategoryOpen(true), []);
  const closeNewCategory = useCallback(() => setNewCategoryOpen(false), []);
  const openNewArticle = useCallback(() => setNewArticleOpen(true), []);
  const closeNewArticle = useCallback(() => setNewArticleOpen(false), []);
  const requestSearchFocus = useCallback(
    () => setFocusSearchRequest((n) => n + 1),
    [],
  );

  const createCategory = useCallback(
    (input: NewKnowledgeCategoryInput): MockKnowledgeCategory => {
      const list = categoriesByProject[project.id] ?? [];
      const category: MockKnowledgeCategory = {
        id: `kc-${crypto.randomUUID().slice(0, 8)}`,
        projectId: project.id,
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        sortOrder: list.length,
      };
      setCategoriesByProject((prev) => ({
        ...prev,
        [project.id]: [...list, category],
      }));
      setSelectedCategoryId(category.id);
      setNewCategoryOpen(false);
      return category;
    },
    [categoriesByProject, project.id],
  );

  const createArticle = useCallback(
    (input: NewKnowledgeArticleInput): MockKnowledgeArticle => {
      const now = new Date().toISOString().slice(0, 10);
      const revision: MockKnowledgeRevision = {
        id: `kr-${crypto.randomUUID().slice(0, 8)}`,
        revisionNumber: 1,
        title: input.title.trim(),
        body: input.body.trim(),
        createdAt: now,
        createdBy: "You",
        changeNote: "Created",
      };
      const article: MockKnowledgeArticle = {
        id: `ka-${crypto.randomUUID().slice(0, 8)}`,
        projectId: project.id,
        categoryId: input.categoryId,
        title: input.title.trim(),
        body: input.body.trim(),
        sourceType: input.sourceType,
        sourceLabel: input.sourceLabel.trim(),
        sourceUri: input.sourceUri?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        revisions: [revision],
      };
      setArticlesByProject((prev) => {
        const list = prev[project.id] ?? [];
        return { ...prev, [project.id]: [article, ...list] };
      });
      setSelectedCategoryId(input.categoryId);
      setSelectedArticleId(article.id);
      setSelectedRevisionId(revision.id);
      setNewArticleOpen(false);
      return article;
    },
    [project.id],
  );

  const reindexArticle = useCallback(
    (articleId: string): KnowledgeActionResult => {
      const list = articlesByProject[project.id] ?? [];
      const article = list.find((a) => a.id === articleId);
      if (!article) {
        return { ok: false, message: "Select an article to index." };
      }
      const indexedAt = new Date().toISOString().slice(0, 10);
      setArticlesByProject((prev) => {
        const current = prev[project.id] ?? [];
        return {
          ...prev,
          [project.id]: current.map((a) =>
            a.id === articleId ? { ...a, indexedAt } : a,
          ),
        };
      });
      return {
        ok: true,
        message: `Queued "${article.title}" for pgvector embedding (mock).`,
      };
    },
    [articlesByProject, project.id],
  );

  const value = useMemo(() => {
    const categories = (categoriesByProject[project.id] ?? []).slice().sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const articles = articlesByProject[project.id] ?? [];
    const filteredArticles = articles
      .filter((article) =>
        selectedCategoryId ? article.categoryId === selectedCategoryId : true,
      )
      .filter((article) => matchesSearch(article, searchQuery))
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const selectedArticle =
      articles.find((article) => article.id === selectedArticleId) ?? null;

    return {
      categories,
      articles,
      filteredArticles,
      selectedCategoryId,
      selectedArticleId,
      selectedArticle,
      selectedRevisionId,
      searchQuery,
      setSelectedCategoryId: (id: string | null) => {
        setSelectedCategoryId(id);
        setSelectedArticleId(null);
        setSelectedRevisionId(null);
      },
      setSelectedArticleId: (id: string | null) => {
        setSelectedArticleId(id);
        setSelectedRevisionId(null);
      },
      setSelectedRevisionId,
      setSearchQuery,
      createCategory,
      createArticle,
      reindexArticle,
      newCategoryOpen,
      newArticleOpen,
      openNewCategory,
      closeNewCategory,
      openNewArticle,
      closeNewArticle,
      focusSearchRequest,
      requestSearchFocus,
    };
  }, [
    categoriesByProject,
    articlesByProject,
    project.id,
    selectedCategoryId,
    selectedArticleId,
    selectedRevisionId,
    searchQuery,
    createCategory,
    createArticle,
    reindexArticle,
    newCategoryOpen,
    newArticleOpen,
    openNewCategory,
    closeNewCategory,
    openNewArticle,
    closeNewArticle,
    focusSearchRequest,
    requestSearchFocus,
  ]);

  return (
    <MockKnowledgeContext.Provider value={value}>
      {children}
    </MockKnowledgeContext.Provider>
  );
}

export function useMockKnowledge(): MockKnowledgeContextValue {
  const ctx = useContext(MockKnowledgeContext);
  if (!ctx) {
    throw new Error("useMockKnowledge must be used within MockKnowledgeProvider");
  }
  return ctx;
}
