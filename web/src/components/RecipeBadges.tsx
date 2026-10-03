import type { RecipeStatus, Visibility } from "../types.ts";

export function RecipeBadges({ status, visibility }: { status: RecipeStatus; visibility: Visibility }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "DRAFT" && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Rascunho
        </span>
      )}
      {visibility === "PRIVATE" && (
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
          Privada
        </span>
      )}
    </div>
  );
}
