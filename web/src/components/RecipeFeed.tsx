import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.ts";
import { RECIPE_CATEGORIES } from "../lib/recipes.ts";
import type { RecipeSummary } from "../types.ts";
import { RecipeCard } from "./RecipeCard.tsx";

interface FeedResponse {
  recipes: RecipeSummary[];
  nextCursor: string | null;
}

function feedPath(search: string, category: string, cursor?: string) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (category) params.set("category", category);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return `/recipes${query ? `?${query}` : ""}`;
}

// Lista de receitas públicas com busca, filtro por categoria e "carregar mais"
export function RecipeFeed() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Espera a pessoa parar de digitar por 300ms antes de buscar
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<FeedResponse>(feedPath(debouncedSearch, category))
      .then((data) => {
        if (cancelled) return;
        setRecipes(data.recipes);
        setNextCursor(data.nextCursor);
      })
      .catch((err) => !cancelled && setError(err instanceof ApiError ? err.message : "Erro ao carregar receitas"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, category]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await api<FeedResponse>(feedPath(debouncedSearch, category, nextCursor));
      setRecipes((current) => [...current, ...data.recipes]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar mais receitas");
    } finally {
      setLoadingMore(false);
    }
  }

  const filtering = debouncedSearch.trim() || category;

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou ingrediente…"
          aria-label="Buscar receitas"
          className="block w-full rounded-lg border border-stone-300 bg-white px-4 py-2.5 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filtrar por categoria"
          className="rounded-lg border border-stone-300 bg-white px-3 py-2.5 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 sm:w-56"
        >
          <option value="">Todas as categorias</option>
          {RECIPE_CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {error && <p className="text-red-600">{error}</p>}
        {loading && !error && <p className="py-10 text-center text-stone-500">Carregando receitas…</p>}

        {!loading && !error && recipes.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-stone-300 px-6 py-14 text-center">
            <p className="font-medium">
              {filtering ? "Nenhuma receita encontrada" : "Ainda não há receitas publicadas"}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              {filtering ? "Tente outro termo ou categoria." : "Que tal ser a primeira pessoa a publicar?"}
            </p>
          </div>
        )}

        {!loading && recipes.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}

        {!loading && nextCursor && (
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-lg bg-white px-5 py-2.5 font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 transition hover:bg-stone-50 disabled:opacity-60"
            >
              {loadingMore ? "Carregando…" : "Carregar mais"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
