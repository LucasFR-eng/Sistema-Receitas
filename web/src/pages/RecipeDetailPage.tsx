import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Avatar } from "../components/Avatar.tsx";
import { CommentsSection } from "../components/CommentsSection.tsx";
import { FavoriteButton } from "../components/FavoriteButton.tsx";
import { RecipeBadges } from "../components/RecipeBadges.tsx";
import { PageLoading } from "../components/RequireAuth.tsx";
import { useRecipe } from "../hooks/useRecipe.ts";
import { api, ApiError } from "../lib/api.ts";
import { DIFFICULTY_LABELS, formatMinutes, mediaUrl } from "../lib/recipes.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";

export function RecipeDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, loading, notFound, error } = useRecipe(id);
  // Ingredientes marcados enquanto a pessoa cozinha
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  if (loading) return <PageLoading />;
  if (notFound) return <NotFoundPage />;
  if (error || !data) return <p className="px-4 py-20 text-center text-red-600">{error}</p>;

  const { recipe, isOwner } = data;

  function toggle(ingredientId: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(ingredientId)) next.delete(ingredientId);
      else next.add(ingredientId);
      return next;
    });
  }

  async function handleDelete() {
    if (!window.confirm(`Excluir "${recipe.name}"? Essa ação não pode ser desfeita.`)) return;
    setDeleting(true);
    try {
      await api(`/recipes/${recipe.id}`, { method: "DELETE" });
      navigate("/minhas-receitas");
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Não foi possível excluir");
      setDeleting(false);
    }
  }

  const meta = [
    recipe.prepMinutes && { label: "Preparo", value: formatMinutes(recipe.prepMinutes) },
    recipe.servings && { label: "Porções", value: String(recipe.servings) },
    recipe.difficulty && { label: "Dificuldade", value: DIFFICULTY_LABELS[recipe.difficulty] },
  ].filter((item) => !!item);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      {recipe.photoUrl && (
        <img
          src={mediaUrl(recipe.photoUrl)}
          alt={recipe.name}
          className="mb-6 aspect-video w-full rounded-2xl object-cover shadow-sm"
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {isOwner && <RecipeBadges status={recipe.status} visibility={recipe.visibility} />}
          {recipe.category && <p className="mt-2 text-sm font-medium text-brand-700">{recipe.category}</p>}
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{recipe.name}</h1>
          <Link to={`/perfil/${recipe.user.username}`} className="group mt-3 flex w-fit items-center gap-2">
            <Avatar name={recipe.user.name} avatarUrl={recipe.user.avatarUrl} size="sm" />
            <span className="text-stone-600">
              por <span className="font-medium text-stone-800 group-hover:underline">{recipe.user.name}</span> · @
              {recipe.user.username}
            </span>
          </Link>
          {recipe.basedOn && (
            <p className="mt-1 text-sm text-stone-600">
              🔁 Baseada na receita{" "}
              {recipe.basedOn.id ? (
                <Link to={`/receitas/${recipe.basedOn.id}`} className="font-medium text-brand-700 hover:underline">
                  {recipe.basedOn.name}
                </Link>
              ) : (
                "original"
              )}{" "}
              de{" "}
              <Link to={`/perfil/${recipe.basedOn.author.username}`} className="font-medium text-brand-700 hover:underline">
                @{recipe.basedOn.author.username}
              </Link>
            </p>
          )}
          {recipe.versionsCount > 0 && (
            <p className="mt-1 text-sm text-stone-500">
              {recipe.versionsCount === 1
                ? "1 pessoa fez a sua versão desta receita"
                : `${recipe.versionsCount} pessoas fizeram a sua versão desta receita`}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <FavoriteButton
            variant="full"
            recipeId={recipe.id}
            isFavorited={recipe.isFavorited}
            favoritesCount={recipe.favoritesCount}
          />
          {!isOwner && (
            <Link
              to={`/receitas/${recipe.id}/minha-versao`}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 transition hover:bg-stone-50"
            >
              🔁 Fazer minha versão
            </Link>
          )}
          {isOwner && (
            <>
              <Link
                to={`/receitas/${recipe.id}/editar`}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 transition hover:bg-stone-50"
              >
                Editar
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-60"
              >
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
            </>
          )}
        </div>
      </div>

      {recipe.description && <p className="mt-4 text-lg text-stone-700">{recipe.description}</p>}

      {meta.length > 0 && (
        <dl className="mt-6 flex flex-wrap gap-3">
          {meta.map((item) => (
            <div key={item.label} className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200">
              <dt className="text-xs text-stone-500">{item.label}</dt>
              <dd className="font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-[2fr_3fr]">
        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-semibold">Ingredientes</h2>
          {recipe.ingredients.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">Nenhum ingrediente ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient.id}>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked.has(ingredient.id)}
                      onChange={() => toggle(ingredient.id)}
                      className="mt-1 size-4 accent-brand-600"
                    />
                    <span className={checked.has(ingredient.id) ? "text-stone-400 line-through" : ""}>
                      {[ingredient.quantity, ingredient.unit].filter(Boolean).length > 0 && (
                        <span className="font-medium">
                          {[ingredient.quantity, ingredient.unit].filter(Boolean).join(" ")}{" "}
                        </span>
                      )}
                      {ingredient.item}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-semibold">Modo de preparo</h2>
          {recipe.steps.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">Nenhum passo ainda.</p>
          ) : (
            <ol className="mt-3 space-y-4">
              {recipe.steps.map((step, index) => (
                <li key={step.id} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {index + 1}
                  </span>
                  <p className="whitespace-pre-line pt-0.5">{step.description}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {recipe.freeText && (
        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
          <h2 className="text-lg font-semibold">Anotações</h2>
          <p className="mt-3 whitespace-pre-line text-stone-700">{recipe.freeText}</p>
        </section>
      )}

      <CommentsSection recipeId={recipe.id} initialCount={recipe.commentsCount} isRecipeOwner={isOwner} />
    </main>
  );
}
