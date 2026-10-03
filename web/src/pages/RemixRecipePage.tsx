import { Link, Navigate, useNavigate, useParams } from "react-router";
import { AiWarnings } from "../components/AiWarnings.tsx";
import { RecipeForm } from "../components/RecipeForm.tsx";
import { PageLoading } from "../components/RequireAuth.tsx";
import { useAiReorganize } from "../hooks/useAiReorganize.ts";
import { useRecipe } from "../hooks/useRecipe.ts";
import { createRecipe } from "../lib/recipes.ts";
import type { RecipeInput } from "../types.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";

// "Fazer minha versão": formulário preenchido com a receita de outra pessoa.
// Nada é salvo até o usuário clicar em salvar; a nova receita guarda o crédito da original.
export function RemixRecipePage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, loading, notFound } = useRecipe(id);
  const { warnings, reorganize } = useAiReorganize();

  if (loading) return <PageLoading />;
  if (notFound || !data) return <NotFoundPage />;
  // A própria receita não precisa de "versão": é só editar
  if (data.isOwner) return <Navigate to={`/receitas/${id}/editar`} replace />;

  const { recipe } = data;

  async function handleSave(input: RecipeInput) {
    const newId = await createRecipe({ ...input, originalRecipeId: recipe.id });
    if (newId) navigate(`/receitas/${newId}`);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <h1 className="mb-4 text-3xl font-bold tracking-tight">Minha versão</h1>
      <div className="mb-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-900 ring-1 ring-brand-200">
        Você está criando sua versão de{" "}
        <Link to={`/receitas/${recipe.id}`} className="font-semibold underline">
          {recipe.name}
        </Link>
        , de @{recipe.user.username}. Mude o que quiser: ela vai mostrar o crédito à receita original automaticamente.
      </div>
      {warnings && (
        <div className="mb-6">
          <AiWarnings warnings={warnings} />
        </div>
      )}
      <RecipeForm initialValues={recipe} onSave={handleSave} onReorganize={reorganize} />
    </main>
  );
}
