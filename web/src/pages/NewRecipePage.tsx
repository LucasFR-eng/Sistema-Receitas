import { useState } from "react";
import { useNavigate } from "react-router";
import { AiWarnings } from "../components/AiWarnings.tsx";
import { ImportPanel } from "../components/ImportPanel.tsx";
import { RecipeForm } from "../components/RecipeForm.tsx";
import { useAiReorganize } from "../hooks/useAiReorganize.ts";
import { draftToFormValues } from "../lib/imports.ts";
import { createRecipe } from "../lib/recipes.ts";
import type { ImportResponse, RecipeInput } from "../types.ts";

type Mode = "import" | "manual";

export function NewRecipePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("import");
  const [imported, setImported] = useState<ImportResponse | null>(null);
  const { warnings, setWarnings, reorganize } = useAiReorganize();

  function handleImported(response: ImportResponse) {
    setImported(response);
    setWarnings(response.warnings);
    window.scrollTo({ top: 0 });
  }

  function startOver() {
    setImported(null);
    setWarnings(null);
    setMode("import");
  }

  async function handleSave(input: RecipeInput) {
    const id = await createRecipe({ ...input, importId: imported?.import.id });
    if (id) navigate(`/receitas/${id}`);
  }

  const showForm = mode === "manual" || imported !== null;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Nova receita</h1>

      {!imported && (
        <div role="tablist" aria-label="Como criar a receita" className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-stone-200/70 p-1">
          {(
            [
              ["import", "✨ Importar com IA"],
              ["manual", "Escrever do zero"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                mode === value ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {imported && (
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200">
            <p className="text-sm">
              <span className="font-semibold">Receita lida pela IA.</span> Revise os campos abaixo antes de publicar.
            </p>
            <button type="button" onClick={startOver} className="text-sm font-medium text-brand-700 hover:underline">
              Importar outro arquivo
            </button>
          </div>
        </div>
      )}

      {warnings && (
        <div className="mb-6">
          <AiWarnings warnings={warnings} />
        </div>
      )}

      {mode === "import" && !imported && <ImportPanel onImported={handleImported} />}

      {showForm && (
        <RecipeForm
          key={imported?.import.id ?? "manual"}
          initialValues={imported ? draftToFormValues(imported.recipe) : undefined}
          onSave={handleSave}
          onReorganize={reorganize}
        />
      )}
    </main>
  );
}
