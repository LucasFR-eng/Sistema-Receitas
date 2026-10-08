import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";
import { FormError, SubmitButton } from "../components/AuthCard.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { PhotoPickerButtons } from "../components/PhotoPickerButtons.tsx";
import { TextField } from "../components/TextField.tsx";
import { api, ApiError, uploadImage, type FieldErrors } from "../lib/api.ts";
import type { User } from "../types.ts";

import { MAX_ORIGINAL_IMAGE_MB } from "../lib/image.ts";
const MAX_BIO = 300;

export function EditProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  // A página fica dentro de <RequireAuth>, então o usuário sempre existe aqui
  const [name, setName] = useState(user!.name);
  const [bio, setBio] = useState(user!.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user!.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_ORIGINAL_IMAGE_MB * 1024 * 1024) {
      setFieldErrors({ ...fieldErrors, avatarUrl: [`A foto pode ter no máximo ${MAX_ORIGINAL_IMAGE_MB} MB`] });
      return;
    }

    setUploading(true);
    setFieldErrors({ ...fieldErrors, avatarUrl: undefined });
    try {
      setAvatarUrl(await uploadImage(file));
    } catch (err) {
      setFieldErrors({ ...fieldErrors, avatarUrl: [err instanceof ApiError ? err.message : "Não foi possível enviar a foto"] });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSaving(true);
    try {
      const { user: updated } = await api<{ user: User }>("/me/profile", {
        method: "PATCH",
        body: { name, bio, avatarUrl },
      });
      updateUser(updated);
      navigate(`/perfil/${updated.username}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError("Algo deu errado. Tente novamente.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-20 pt-6">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Editar perfil</h1>

      <form onSubmit={handleSubmit} noValidate className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
        <FormError message={error} />

        <div>
          <span className="block text-sm font-medium text-stone-700">Foto</span>
          <div className="mt-2 flex items-center gap-4">
            <Avatar name={name || user!.name} avatarUrl={avatarUrl} size="lg" />
            <div className="flex flex-wrap gap-2">
              <PhotoPickerButtons
                hasPhoto={Boolean(avatarUrl)}
                uploading={uploading}
                camera="user"
                onChange={handlePhoto}
              />
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
                >
                  Remover
                </button>
              )}
            </div>
          </div>
          <p className={`mt-1 text-sm ${fieldErrors.avatarUrl ? "text-red-600" : "text-stone-500"}`}>
            {fieldErrors.avatarUrl?.[0] ?? "JPG, PNG ou WEBP"}
          </p>
        </div>

        <TextField
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name?.[0]}
          autoComplete="name"
          required
        />

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-stone-700">
            Bio (opcional)
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={MAX_BIO}
            placeholder="Conte um pouco sobre você e sua cozinha"
            className="mt-1 block w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <p className={`mt-1 text-sm ${fieldErrors.bio ? "text-red-600" : "text-stone-500"}`}>
            {fieldErrors.bio?.[0] ?? `${bio.length}/${MAX_BIO}`}
          </p>
        </div>

        <p className="text-sm text-stone-500">
          Seu usuário <span className="font-medium text-stone-700">@{user!.username}</span> não pode ser alterado.
        </p>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link
            to={`/perfil/${user!.username}`}
            className="rounded-lg px-5 py-2.5 text-center font-medium text-stone-700 transition hover:bg-stone-100"
          >
            Cancelar
          </Link>
          <div className="sm:w-40">
            <SubmitButton loading={saving || uploading}>Salvar</SubmitButton>
          </div>
        </div>
      </form>
    </main>
  );
}
