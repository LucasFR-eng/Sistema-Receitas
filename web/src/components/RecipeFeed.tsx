import { useEffect, useRef, useState } from "react";
import { useFeedEvents, type FeedEvent } from "../hooks/useFeedEvents.ts";
import { api, ApiError } from "../lib/api.ts";
import { RECIPE_CATEGORIES } from "../lib/recipes.ts";
import type { RecipeSummary } from "../types.ts";
import { RecipeCard } from "./RecipeCard.tsx";

interface FeedResponse {
  recipes: RecipeSummary[];
  nextCursor: string | null;
}

// Até onde (em pixels) a pessoa pode ter rolado para a receita nova entrar direto no topo
const AUTO_INSERT_SCROLL_LIMIT = 300;

function feedPath(search: string, category: string, cursor?: string) {
  const params = new URLSearchParams();
  if (search.trim()) params.set("q", search.trim());
  if (category) params.set("category", category);
  if (cursor) params.set("cursor", cursor);
  const query = params.toString();
  return `/recipes${query ? `?${query}` : ""}`;
}

// Coloca receitas no começo da lista sem repetir as que já estão nela
function prependUnique(list: RecipeSummary[], incoming: RecipeSummary[]) {
  const ids = new Set(incoming.map((recipe) => recipe.id));
  return [...incoming, ...list.filter((recipe) => !ids.has(recipe.id))];
}

// Lista de receitas públicas com busca, filtro por categoria, "carregar mais" e atualização em tempo real
export function RecipeFeed() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState("");
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Receitas que chegaram enquanto a pessoa estava rolando a página
  const [pending, setPending] = useState<RecipeSummary[]>([]);
  // Receitas recém-chegadas, para animar a entrada
  const [arrivedIds, setArrivedIds] = useState<Set<string>>(new Set());
  const feedTop = useRef<HTMLDivElement>(null);

  const filtering = Boolean(debouncedSearch.trim() || category);

  // Espera a pessoa parar de digitar por 300ms antes de buscar
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPending([]);
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

  function markArrived(ids: string[]) {
    setArrivedIds((current) => new Set([...current, ...ids]));
  }

  function handleFeedEvent(event: FeedEvent) {
    if (event.type === "recipe:removed") {
      setRecipes((current) => current.filter((recipe) => recipe.id !== event.id));
      setPending((current) => current.filter((recipe) => recipe.id !== event.id));
      return;
    }

    if (event.type === "recipe:updated") {
      const replace = (list: RecipeSummary[]) =>
        list.map((recipe) => (recipe.id === event.recipe.id ? event.recipe : recipe));
      setRecipes(replace);
      setPending(replace);
      return;
    }

    // Receita nova: com busca ou filtro ativo, ela pode não combinar; aparece quando os filtros forem limpos
    if (filtering) return;

    if (window.scrollY < AUTO_INSERT_SCROLL_LIMIT) {
      setRecipes((current) => prependUnique(current, [event.recipe]));
      markArrived([event.recipe.id]);
    } else {
      setPending((current) => prependUnique(current, [event.recipe]));
    }
  }

  // Se a conexão caiu, pode ter perdido avisos: recarrega a primeira página sem mostrar "Carregando"
  async function refreshSilently() {
    try {
      const data = await api<FeedResponse>(feedPath(debouncedSearch, category));
      setRecipes(data.recipes);
      setNextCursor(data.nextCursor);
      setPending([]);
    } catch {
      // Mantém a lista atual; a próxima reconexão tenta de novo
    }
  }

  const live = useFeedEvents({ onEvent: handleFeedEvent, onReconnect: refreshSilently });

  function showPending() {
    setRecipes((current) => prependUnique(current, pending));
    markArrived(pending.map((recipe) => recipe.id));
    setPending([]);
    feedTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await api<FeedResponse>(feedPath(debouncedSearch, category, nextCursor));
      setRecipes((current) => [...current, ...data.recipes.filter((recipe) => !current.some((c) => c.id === recipe.id))]);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao carregar mais receitas");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section>
      <div ref={feedTop} className="scroll-mt-4" />
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

      <p className="mt-3 flex items-center gap-2 text-xs text-stone-500" aria-live="polite">
        <span className={`size-2 rounded-full ${live ? "animate-pulse bg-green-500" : "bg-stone-300"}`} />
        {live ? "Ao vivo: receitas novas aparecem sozinhas" : "Conectando ao feed ao vivo…"}
      </p>

      {pending.length > 0 && (
        <div className="sticky top-3 z-10 mt-4 flex justify-center">
          <button
            type="button"
            onClick={showPending}
            className="recipe-arrive rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition hover:bg-brand-700"
          >
            ↑ {pending.length} {pending.length === 1 ? "receita nova" : "receitas novas"}
          </button>
        </div>
      )}

      <div className="mt-4">
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
              <div key={recipe.id} className={arrivedIds.has(recipe.id) ? "recipe-arrive" : undefined}>
                <RecipeCard recipe={recipe} />
              </div>
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
