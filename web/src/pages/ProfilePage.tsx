import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { RecipeCard } from "../components/RecipeCard.tsx";
import { PageLoading } from "../components/RequireAuth.tsx";
import { api, ApiError } from "../lib/api.ts";
import type { ProfileResponse, RecipeSummary } from "../types.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";

interface RecipesPage {
  recipes: RecipeSummary[];
  nextCursor: string | null;
}

const joinedFormat = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

export function ProfilePage() {
  const { username = "" } = useParams();
  const navigate = useNavigate();
  const { user: viewer } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setNotFound(false);
    setError(null);

    Promise.all([
      api<ProfileResponse>(`/users/${username}`),
      api<RecipesPage>(`/users/${username}/recipes`),
    ])
      .then(([profileData, recipesData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setRecipes(recipesData.recipes);
        setNextCursor(recipesData.nextCursor);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : "Erro ao carregar o perfil");
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await api<RecipesPage>(`/users/${username}/recipes?cursor=${nextCursor}`);
      setRecipes((current) => [...current, ...data.recipes]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  // Administrador exclui o usuário e tudo dele
  async function deleteUser() {
    if (
      !window.confirm(
        `Excluir o usuário @${username}? As receitas, comentários e favoritos dele também serão apagados. Essa ação não pode ser desfeita.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await api(`/users/${username}`, { method: "DELETE" });
      navigate("/");
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Não foi possível excluir o usuário");
      setDeleting(false);
    }
  }

  if (notFound) return <NotFoundPage />;
  if (error) return <p className="px-4 py-20 text-center text-red-600">{error}</p>;
  if (!profile) return <PageLoading />;

  const { user, stats, isMe } = profile;
  const firstName = user.name.split(" ")[0];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-6">
      <section className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:flex-row sm:items-center">
        <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{user.name}</h1>
          <p className="text-stone-500">@{user.username}</p>
          {user.bio && <p className="mt-3 whitespace-pre-line text-stone-700">{user.bio}</p>}
          <p className="mt-3 text-sm text-stone-500">
            No Receita+ desde {joinedFormat.format(new Date(user.createdAt))}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <dl className="flex gap-6">
            <div>
              <dt className="text-xs text-stone-500">Receitas</dt>
              <dd className="text-xl font-bold">{stats.recipesCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Salvamentos</dt>
              <dd className="text-xl font-bold">{stats.favoritesReceived}</dd>
            </div>
          </dl>
          {isMe && (
            <Link
              to="/editar-perfil"
              className="rounded-lg bg-white px-4 py-2 text-center text-sm font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 transition hover:bg-stone-50"
            >
              Editar perfil
            </Link>
          )}
          {!isMe && viewer?.isAdmin && (
            <button
              type="button"
              onClick={deleteUser}
              disabled={deleting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200 transition hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? "Excluindo…" : "🛡️ Excluir usuário (admin)"}
            </button>
          )}
        </div>
      </section>

      <h2 className="mb-4 mt-10 text-xl font-bold tracking-tight">
        {isMe ? "Suas receitas públicas" : `Receitas de ${firstName}`}
      </h2>

      {recipes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-stone-300 px-6 py-14 text-center">
          <p className="font-medium">{isMe ? "Você ainda não publicou receitas" : `${firstName} ainda não publicou receitas`}</p>
          {isMe && (
            <Link to="/receitas/nova" className="mt-3 inline-block font-medium text-brand-700 hover:underline">
              Publicar a primeira
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg bg-white px-5 py-2.5 font-medium text-stone-700 shadow-sm ring-1 ring-stone-300 transition hover:bg-stone-50 disabled:opacity-60"
          >
            {loadingMore ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </main>
  );
}
