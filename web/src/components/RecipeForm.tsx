import { useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ApiError, uploadImage, type FieldErrors } from "../lib/api.ts";
import { DIFFICULTY_LABELS, mediaUrl, RECIPE_CATEGORIES } from "../lib/recipes.ts";
import type { Difficulty, RecipeInput, RecipeStatus, Visibility } from "../types.ts";
import { FormError } from "./AuthCard.tsx";
import { TextField } from "./TextField.tsx";

const MAX_IMAGE_MB = 5;

// Cada linha ganha uma "key" estável para o React não confundir as linhas ao remover/reordenar
interface IngredientRow {
  key: string;
  quantity: string;
  unit: string;
  item: string;
}

interface StepRow {
  key: string;
  text: string;
}

interface FormState {
  name: string;
  description: string;
  photoUrl: string | null;
  category: string;
  prepMinutes: string;
  servings: string;
  difficulty: Difficulty | "";
  visibility: Visibility;
  freeText: string;
  ingredients: IngredientRow[];
  steps: StepRow[];
}

// Valores iniciais do formulário: uma receita existente (edição) ou um rascunho lido pela IA
export interface RecipeFormValues {
  name: string;
  description: string | null;
  photoUrl?: string | null;
  category: string | null;
  prepMinutes: number | null;
  servings: number | null;
  difficulty: Difficulty | null;
  visibility?: Visibility;
  freeText: string | null;
  ingredients: { id?: string; quantity: string | null; unit: string | null; item: string }[];
  steps: { id?: string; description: string }[];
}

const newKey = () => crypto.randomUUID();
const emptyIngredient = (): IngredientRow => ({ key: newKey(), quantity: "", unit: "", item: "" });
const emptyStep = (): StepRow => ({ key: newKey(), text: "" });

function toFormState(recipe?: RecipeFormValues): FormState {
  if (!recipe) {
    return {
      name: "",
      description: "",
      photoUrl: null,
      category: "",
      prepMinutes: "",
      servings: "",
      difficulty: "",
      visibility: "PUBLIC",
      freeText: "",
      ingredients: [emptyIngredient(), emptyIngredient(), emptyIngredient()],
      steps: [emptyStep(), emptyStep()],
    };
  }

  return {
    name: recipe.name,
    description: recipe.description ?? "",
    photoUrl: recipe.photoUrl ?? null,
    category: recipe.category ?? "",
    prepMinutes: recipe.prepMinutes?.toString() ?? "",
    servings: recipe.servings?.toString() ?? "",
    difficulty: recipe.difficulty ?? "",
    visibility: recipe.visibility ?? "PUBLIC",
    freeText: recipe.freeText ?? "",
    ingredients: recipe.ingredients.length
      ? recipe.ingredients.map((ingredient) => ({
          key: ingredient.id ?? newKey(),
          quantity: ingredient.quantity ?? "",
          unit: ingredient.unit ?? "",
          item: ingredient.item,
        }))
      : [emptyIngredient()],
    steps: recipe.steps.length
      ? recipe.steps.map((step) => ({ key: step.id ?? newKey(), text: step.description }))
      : [emptyStep()],
  };
}

const toNumber = (value: string) => (value.trim() ? Number(value) : null);
const toText = (value: string) => value.trim() || null;

function toInput(form: FormState, status: RecipeStatus): RecipeInput {
  return {
    name: form.name,
    description: toText(form.description),
    photoUrl: form.photoUrl,
    category: form.category || null,
    prepMinutes: toNumber(form.prepMinutes),
    servings: toNumber(form.servings),
    difficulty: form.difficulty || null,
    visibility: form.visibility,
    status,
    freeText: toText(form.freeText),
    // Linhas deixadas em branco são ignoradas
    ingredients: form.ingredients
      .filter((row) => row.item.trim())
      .map((row) => ({ quantity: toText(row.quantity), unit: toText(row.unit), item: row.item })),
    steps: form.steps.map((row) => row.text).filter((text) => text.trim()),
  };
}

function move<T>(list: T[], from: number, to: number): T[] {
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item!);
  return copy;
}

const MIN_REORGANIZE_LENGTH = 20;

interface RecipeFormProps {
  initialValues?: RecipeFormValues;
  onSave: (input: RecipeInput) => Promise<void>;
  // Envia o texto livre para a IA e devolve a receita reorganizada
  onReorganize?: (text: string) => Promise<RecipeFormValues>;
}

export function RecipeForm({ initialValues, onSave, onReorganize }: RecipeFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(initialValues));
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState<RecipeStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [reorganizing, setReorganizing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const ids = useId();

  function update<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateIngredient(index: number, field: keyof Omit<IngredientRow, "key">, value: string) {
    update(
      "ingredients",
      form.ingredients.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function updateStep(index: number, text: string) {
    update(
      "steps",
      form.steps.map((row, i) => (i === index ? { ...row, text } : row)),
    );
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setFieldErrors((current) => ({ ...current, photoUrl: [`A imagem pode ter no máximo ${MAX_IMAGE_MB} MB`] }));
      return;
    }

    setUploading(true);
    setFieldErrors((current) => ({ ...current, photoUrl: undefined }));
    try {
      update("photoUrl", await uploadImage(file));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Não foi possível enviar a imagem";
      setFieldErrors((current) => ({ ...current, photoUrl: [message] }));
    } finally {
      setUploading(false);
    }
  }

  async function reorganize() {
    if (!onReorganize) return;
    const hasContent = form.ingredients.some((row) => row.item.trim()) || form.steps.some((row) => row.text.trim());
    if (
      hasContent &&
      !window.confirm("A IA vai substituir nome, ingredientes, passos e detalhes pelo que entender do texto. Continuar?")
    ) {
      return;
    }

    setReorganizing(true);
    setFieldErrors((current) => ({ ...current, freeText: undefined }));
    try {
      const values = await onReorganize(form.freeText);
      const next = toFormState(values);
      // Mantém o que a IA não mexe: foto, visibilidade e o texto que o usuário escreveu
      setForm((current) => ({
        ...next,
        name: next.name || current.name,
        photoUrl: current.photoUrl,
        visibility: current.visibility,
        freeText: current.freeText,
      }));
    } catch (err) {
      const message = err instanceof ApiError ? (err.fieldErrors.text?.[0] ?? err.message) : "Não foi possível reorganizar";
      setFieldErrors((current) => ({ ...current, freeText: [message] }));
    } finally {
      setReorganizing(false);
    }
  }

  async function submit(status: RecipeStatus) {
    setError(null);
    setFieldErrors({});
    setSaving(status);
    try {
      await onSave(toInput(form, status));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError("Algo deu errado. Tente novamente.");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(null);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit("PUBLISHED");
  }

  const busy = saving !== null || uploading || reorganizing;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <FormError message={error} />

      <Section title="Informações básicas">
        <TextField
          label="Nome da receita"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          error={fieldErrors.name?.[0]}
          placeholder="ex: Bolo de cenoura da vó"
          required
        />
        <TextArea
          label="Descrição (opcional)"
          value={form.description}
          onChange={(value) => update("description", value)}
          error={fieldErrors.description?.[0]}
          rows={2}
          placeholder="Uma frase sobre a receita"
        />

        <div>
          <span className="block text-sm font-medium text-stone-700">Foto (opcional)</span>
          <div className="mt-1 flex items-center gap-4">
            <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-stone-100 text-xs text-stone-400 ring-1 ring-stone-200">
              {form.photoUrl ? (
                <img src={mediaUrl(form.photoUrl)} alt="Foto da receita" className="size-full object-cover" />
              ) : uploading ? (
                "Enviando…"
              ) : (
                "Sem foto"
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 transition hover:bg-stone-50 disabled:opacity-60"
              >
                {form.photoUrl ? "Trocar foto" : "Escolher foto"}
              </button>
              {form.photoUrl && (
                <button
                  type="button"
                  onClick={() => update("photoUrl", null)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Remover
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhoto}
              className="hidden"
            />
          </div>
          <FieldMessage error={fieldErrors.photoUrl?.[0]} hint={`JPG, PNG ou WEBP, até ${MAX_IMAGE_MB} MB`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-category`} className="block text-sm font-medium text-stone-700">
              Categoria
            </label>
            <select
              id={`${ids}-category`}
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Selecione…</option>
              {RECIPE_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
            <FieldMessage error={fieldErrors.category?.[0]} />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-stone-700">Dificuldade</legend>
            <div className="mt-1 grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1">
              {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((level) => (
                <label
                  key={level}
                  className={`cursor-pointer rounded-md px-2 py-1.5 text-center text-sm font-medium transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                    form.difficulty === level ? "bg-white text-stone-900 shadow-sm" : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${ids}-difficulty`}
                    value={level}
                    checked={form.difficulty === level}
                    onChange={() => update("difficulty", level)}
                    onClick={() => form.difficulty === level && update("difficulty", "")}
                    className="sr-only"
                  />
                  {DIFFICULTY_LABELS[level]}
                </label>
              ))}
            </div>
          </fieldset>

          <TextField
            label="Tempo de preparo (minutos)"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.prepMinutes}
            onChange={(e) => update("prepMinutes", e.target.value)}
            error={fieldErrors.prepMinutes?.[0]}
            placeholder="ex: 45"
          />
          <TextField
            label="Porções"
            type="number"
            inputMode="numeric"
            min={1}
            value={form.servings}
            onChange={(e) => update("servings", e.target.value)}
            error={fieldErrors.servings?.[0]}
            placeholder="ex: 8"
          />
        </div>
      </Section>

      <Section title="Ingredientes" error={fieldErrors.ingredients?.[0]}>
        <ul className="space-y-2">
          {form.ingredients.map((row, index) => (
            <li key={row.key} className="grid grid-cols-[4rem_5.5rem_1fr_auto] gap-2 sm:grid-cols-[5rem_8rem_1fr_auto]">
              <input
                aria-label={`Quantidade do ingrediente ${index + 1}`}
                value={row.quantity}
                onChange={(e) => updateIngredient(index, "quantity", e.target.value)}
                placeholder="Qtd"
                className={inputClass}
              />
              <input
                aria-label={`Unidade do ingrediente ${index + 1}`}
                value={row.unit}
                onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                placeholder="Unidade"
                className={inputClass}
              />
              <input
                aria-label={`Ingrediente ${index + 1}`}
                value={row.item}
                onChange={(e) => updateIngredient(index, "item", e.target.value)}
                placeholder="Ingrediente"
                className={inputClass}
              />
              <IconButton
                label={`Remover ingrediente ${index + 1}`}
                onClick={() => update("ingredients", form.ingredients.filter((_, i) => i !== index))}
              >
                ✕
              </IconButton>
            </li>
          ))}
        </ul>
        <AddButton onClick={() => update("ingredients", [...form.ingredients, emptyIngredient()])}>
          Adicionar ingrediente
        </AddButton>
      </Section>

      <Section title="Modo de preparo" error={fieldErrors.steps?.[0]}>
        <ol className="space-y-3">
          {form.steps.map((row, index) => (
            <li key={row.key} className="flex gap-2">
              <span className="mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                {index + 1}
              </span>
              <textarea
                aria-label={`Passo ${index + 1}`}
                value={row.text}
                onChange={(e) => updateStep(index, e.target.value)}
                rows={2}
                placeholder="Descreva este passo"
                className={`${inputClass} flex-1 resize-y`}
              />
              <div className="flex flex-col gap-1">
                <IconButton
                  label={`Mover passo ${index + 1} para cima`}
                  disabled={index === 0}
                  onClick={() => update("steps", move(form.steps, index, index - 1))}
                >
                  ↑
                </IconButton>
                <IconButton
                  label={`Mover passo ${index + 1} para baixo`}
                  disabled={index === form.steps.length - 1}
                  onClick={() => update("steps", move(form.steps, index, index + 1))}
                >
                  ↓
                </IconButton>
                <IconButton
                  label={`Remover passo ${index + 1}`}
                  onClick={() => update("steps", form.steps.filter((_, i) => i !== index))}
                >
                  ✕
                </IconButton>
              </div>
            </li>
          ))}
        </ol>
        <AddButton onClick={() => update("steps", [...form.steps, emptyStep()])}>Adicionar passo</AddButton>
      </Section>

      <Section title="Anotações">
        <TextArea
          label="Texto livre (opcional)"
          value={form.freeText}
          onChange={(value) => update("freeText", value)}
          error={fieldErrors.freeText?.[0]}
          rows={6}
          placeholder="Dicas, variações, a história da receita… ou cole o texto de uma receita e clique em Reorganizar com IA."
          hint="O texto lido pela IA aparece aqui. Corrija o que ela não entendeu e clique em Reorganizar com IA para atualizar os campos."
        />
        {onReorganize && (
          <button
            type="button"
            onClick={reorganize}
            disabled={busy || form.freeText.trim().length < MIN_REORGANIZE_LENGTH}
            className="rounded-lg bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 ring-1 ring-brand-200 transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {reorganizing ? "Reorganizando… pode levar até 1 minuto" : "✨ Reorganizar com IA"}
          </button>
        )}
      </Section>

      <Section title="Quem pode ver">
        <div className="grid gap-2 sm:grid-cols-2">
          {(
            [
              ["PUBLIC", "Pública", "Aparece no feed para todo mundo"],
              ["PRIVATE", "Privada", "Só você vê"],
            ] as const
          ).map(([value, title, text]) => (
            <label
              key={value}
              className={`flex cursor-pointer gap-3 rounded-lg p-3 ring-1 transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500 ${
                form.visibility === value ? "bg-brand-50 ring-brand-500" : "bg-white ring-stone-200 hover:ring-stone-300"
              }`}
            >
              <input
                type="radio"
                name={`${ids}-visibility`}
                value={value}
                checked={form.visibility === value}
                onChange={() => update("visibility", value)}
                className="mt-1 accent-brand-600"
              />
              <span>
                <span className="block font-medium">{title}</span>
                <span className="block text-sm text-stone-600">{text}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <div className="flex flex-col-reverse gap-2 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => submit("DRAFT")}
          disabled={busy}
          className="rounded-lg bg-white px-5 py-2.5 font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 transition hover:bg-stone-50 disabled:opacity-60"
        >
          {saving === "DRAFT" ? "Salvando…" : "Salvar rascunho"}
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {saving === "PUBLISHED" ? "Publicando…" : "Publicar"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "block w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Section({ title, error, children }: { title: string; error?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function FieldMessage({ error, hint }: { error?: string; hint?: string }) {
  const message = error ?? hint;
  if (!message) return null;
  return <p className={`mt-1 text-sm ${error ? "text-red-600" : "text-stone-500"}`}>{message}</p>;
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  rows?: number;
  placeholder?: string;
}

function TextArea({ label, value, onChange, error, hint, rows = 3, placeholder }: TextAreaProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        className={`${inputClass} mt-1 resize-y`}
      />
      <FieldMessage error={error} hint={hint} />
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-9 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-50"
    >
      + {children}
    </button>
  );
}
