import { useEffect, useState } from "react";
import { Link } from "react-router";
import { RecipeCard } from "../components/RecipeCard.tsx";
import { PageLoading } from "../components/RequireAuth.tsx";
import { api, ApiError } from "../lib/api.ts";
import type { RecipeSummary } from "../types.ts";

export function FavoritesPage() {
  const [recipes, setRecipes] = useState<RecipeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ recipes: RecipeSummary[] }>("/me/favorites")
      .then((data) => setRecipes(data.recipes))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erro ao carregar suas receitas salvas"));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Receitas salvas</h1>

      {error && <p className="text-red-600">{error}</p>}
      {!recipes && !error && <PageLoading />}

      {recipes?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 px-6 py-16 text-center">
          <p className="text-lg font-medium">Nenhuma receita salva ainda</p>
          <p className="mt-1 text-stone-600">Toque no coração de uma receita para guardá-la aqui.</p>
          <Link to="/" className="mt-4 inline-block font-medium text-brand-700 hover:underline">
            Explorar receitas
          </Link>
        </div>
      )}

      {recipes && recipes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </main>
  );
}
