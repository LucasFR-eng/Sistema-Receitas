import { Navigate, useNavigate, useParams } from "react-router";
import { RecipeForm } from "../components/RecipeForm.tsx";
import { PageLoading } from "../components/RequireAuth.tsx";
import { useRecipe } from "../hooks/useRecipe.ts";
import { api } from "../lib/api.ts";
import type { RecipeInput } from "../types.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";

export function EditRecipePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, loading, notFound } = useRecipe(id);

  if (loading) return <PageLoading />;
  if (notFound || !data) return <NotFoundPage />;
  if (!data.isOwner) return <Navigate to={`/receitas/${id}`} replace />;

  async function handleSave(input: RecipeInput) {
    await api(`/recipes/${id}`, { method: "PUT", body: input });
    navigate(`/receitas/${id}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Editar receita</h1>
      <RecipeForm recipe={data.recipe} onSave={handleSave} />
    </main>
  );
}
