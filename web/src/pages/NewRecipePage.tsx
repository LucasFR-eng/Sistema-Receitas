import { useNavigate } from "react-router";
import { RecipeForm } from "../components/RecipeForm.tsx";
import { api, ApiError } from "../lib/api.ts";
import type { RecipeInput } from "../types.ts";

export function NewRecipePage() {
  const navigate = useNavigate();

  async function handleSave(input: RecipeInput) {
    try {
      const { recipe } = await api<{ recipe: { id: string } }>("/recipes", { method: "POST", body: input });
      navigate(`/receitas/${recipe.id}`);
    } catch (err) {
      // Receita igual a outra do usuário: pergunta antes de salvar mesmo assim
      if (err instanceof ApiError && err.data.code === "DUPLICATE_RECIPE") {
        if (window.confirm(`${err.message}.\n\nSalvar mesmo assim?`)) {
          return handleSave({ ...input, allowDuplicate: true });
        }
        return;
      }
      throw err;
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Nova receita</h1>
      <RecipeForm onSave={handleSave} />
    </main>
  );
}
