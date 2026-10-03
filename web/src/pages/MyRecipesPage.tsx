import { useEffect, useState } from "react";
import { Link } from "react-router";
import { RecipeCard } from "../components/RecipeCard.tsx";
import { PageLoading } from "../components/RequireAuth.tsx";
import { api, ApiError } from "../lib/api.ts";
import type { RecipeSummary } from "../types.ts";

export function MyRecipesPage() {
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ recipes: RecipeSummary[] }>("/me/recipes")
      .then((data) => setRecipes(data.recipes))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar suas receitas"));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Minhas receitas</h1>
        <Link
          to="/receitas/nova"
          className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          + Nova receita
        </Link>
      </div>

      {error && <p className="text-red-600">{error}</p>}
      {!recipes && !error && <PageLoading />}

      {recipes?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 px-6 py-16 text-center">
          <p className="text-lg font-medium">Você ainda não tem receitas</p>
          <p className="mt-1 text-stone-600">Comece cadastrando aquela receita que todo mundo pede.</p>
        </div>
      )}

      {recipes && recipes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} showStatus />
          ))}
        </div>
      )}
    </main>
  );
}
