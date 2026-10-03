import { Link } from "react-router";
import { DIFFICULTY_LABELS, formatMinutes, mediaUrl } from "../lib/recipes.ts";
import type { RecipeSummary } from "../types.ts";
import { FavoriteButton } from "./FavoriteButton.tsx";
import { RecipeBadges } from "./RecipeBadges.tsx";

export function RecipeCard({ recipe, showStatus = false }: { recipe: RecipeSummary; showStatus?: boolean }) {
  const meta = [
    recipe.prepMinutes && formatMinutes(recipe.prepMinutes),
    recipe.difficulty && DIFFICULTY_LABELS[recipe.difficulty],
    recipe.servings && `${recipe.servings} ${recipe.servings === 1 ? "porção" : "porções"}`,
  ].filter(Boolean);

  return (
    // O coração fica fora do link (botão dentro de link não é HTML válido) e é posicionado sobre a foto
    <div className="relative h-full">
      <Link
        to={`/receitas/${recipe.id}`}
        className="group flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:shadow-md hover:ring-stone-300"
      >
        <div className="aspect-[4/3] bg-brand-50">
          {recipe.photoUrl ? (
            <img
              src={mediaUrl(recipe.photoUrl)}
              alt=""
              loading="lazy"
              className="size-full object-cover transition group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl font-bold text-brand-200">
              {recipe.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          {showStatus && <RecipeBadges status={recipe.status} visibility={recipe.visibility} />}
          {recipe.category && <p className="text-xs font-medium text-brand-700">{recipe.category}</p>}
          <h3 className="font-semibold leading-snug text-stone-900">{recipe.name}</h3>
          {meta.length > 0 && <p className="text-sm text-stone-500">{meta.join(" · ")}</p>}
          {!showStatus && <p className="mt-auto pt-1 text-sm text-stone-500">@{recipe.user.username}</p>}
        </div>
      </Link>
      <div className="absolute right-2 top-2">
        <FavoriteButton recipeId={recipe.id} isFavorited={recipe.isFavorited} favoritesCount={recipe.favoritesCount} />
      </div>
    </div>
  );
}
