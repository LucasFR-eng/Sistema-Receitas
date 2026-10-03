import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api.ts";
import type { Recipe } from "../types.ts";

interface RecipeResponse {
  recipe: Recipe;
  isOwner: boolean;
}

// Carrega uma receita pelo id
export function useRecipe(id: string) {
  const [data, setData] = useState<RecipeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setError(null);

    api<RecipeResponse>(`/recipes/${id}`)
      .then((response) => !cancelled && setData(response))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : "Erro ao carregar a receita");
      })
      .finally(() => !cancelled && setLoading(false));

    // Evita atualizar a tela se o usuário trocou de página antes da resposta chegar
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { data, loading, notFound, error };
}
