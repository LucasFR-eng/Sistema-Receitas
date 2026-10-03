import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";
import { useServerEvents } from "../hooks/useServerEvents.ts";
import { api, ApiError } from "../lib/api.ts";
import { timeAgo } from "../lib/time.ts";
import type { Comment } from "../types.ts";
import { Avatar } from "./Avatar.tsx";

const MAX_LENGTH = 1_000;

type CommentEvent = { type: "comment:created"; comment: Comment } | { type: "comment:deleted"; id: string };
const COMMENT_EVENT_TYPES: CommentEvent["type"][] = ["comment:created", "comment:deleted"];

interface CommentsPage {
  comments: Comment[];
  nextCursor: string | null;
}

interface CommentsSectionProps {
  recipeId: string;
  initialCount: number;
  // O dono da receita pode apagar qualquer comentário nela
  isRecipeOwner: boolean;
}

export function CommentsSection({ recipeId, initialCount, isRecipeOwner }: CommentsSectionProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ids dos comentários já na tela: o mesmo comentário pode chegar pela resposta da API
  // e pelo tempo real, e não pode aparecer (nem ser contado) duas vezes
  const knownIds = useRef(new Set<string>());

  async function loadFirstPage() {
    try {
      const data = await api<CommentsPage>(`/recipes/${recipeId}/comments`);
      knownIds.current = new Set(data.comments.map((comment) => comment.id));
      setComments(data.comments);
      setNextCursor(data.nextCursor);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFirstPage();
  }, [recipeId]);

  function addComment(comment: Comment) {
    if (knownIds.current.has(comment.id)) return;
    knownIds.current.add(comment.id);
    setComments((current) => [comment, ...current]);
    setCount((value) => value + 1);
  }

  function removeComment(id: string) {
    if (!knownIds.current.has(id)) return;
    knownIds.current.delete(id);
    setComments((current) => current.filter((item) => item.id !== id));
    setCount((value) => Math.max(0, value - 1));
  }

  // Comentários de outras pessoas aparecem e somem na hora
  useServerEvents<CommentEvent>(`/recipes/${recipeId}/events`, {
    types: COMMENT_EVENT_TYPES,
    onEvent: (event) => (event.type === "comment:created" ? addComment(event.comment) : removeComment(event.id)),
    onReconnect: loadFirstPage,
  });

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await api<CommentsPage>(`/recipes/${recipeId}/comments?cursor=${nextCursor}`);
      const older = data.comments.filter((comment) => !knownIds.current.has(comment.id));
      for (const comment of older) knownIds.current.add(comment.id);
      setComments((current) => [...current, ...older]);
      setNextCursor(data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    setError(null);
    try {
      const { comment } = await api<{ comment: Comment }>(`/recipes/${recipeId}/comments`, {
        method: "POST",
        body: { content: text },
      });
      addComment(comment);
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.content?.[0] ?? err.message) : "Não foi possível comentar");
    } finally {
      setPosting(false);
    }
  }

  // Ctrl+Enter (ou Cmd+Enter no Mac) envia o comentário
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) handleSubmit();
  }

  async function handleDelete(comment: Comment) {
    if (!window.confirm("Apagar este comentário?")) return;
    try {
      await api(`/comments/${comment.id}`, { method: "DELETE" });
      removeComment(comment.id);
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Não foi possível apagar o comentário");
    }
  }

  return (
    <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
      <h2 className="text-lg font-semibold">
        Comentários {count > 0 && <span className="font-normal text-stone-500">({count})</span>}
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              maxLength={MAX_LENGTH}
              placeholder="Fez a receita? Conte como ficou, uma dica ou uma dúvida…"
              aria-label="Escrever comentário"
              className="block w-full resize-y rounded-lg border border-stone-300 bg-white px-3 py-2 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className={`text-xs ${error ? "text-red-600" : "text-stone-400"}`} role={error ? "alert" : undefined}>
                {error ?? (text.length > MAX_LENGTH * 0.8 ? `${text.length}/${MAX_LENGTH}` : "Ctrl + Enter para enviar")}
              </p>
              <button
                type="submit"
                disabled={posting || !text.trim()}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
              >
                {posting ? "Enviando…" : "Comentar"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mt-4 rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">
          <Link to="/entrar" state={{ from: location.pathname }} className="font-medium text-brand-700 hover:underline">
            Entre
          </Link>{" "}
          para comentar.
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-stone-500">Carregando comentários…</p>
      ) : comments.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">Ninguém comentou ainda. Que tal ser a primeira pessoa?</p>
      ) : (
        <ul className="mt-6 space-y-5">
          {comments.map((comment) => {
            const canDelete = user && (user.username === comment.user.username || isRecipeOwner);
            return (
              <li key={comment.id} className="recipe-arrive flex gap-3">
                <Link to={`/perfil/${comment.user.username}`} aria-label={`Perfil de ${comment.user.name}`}>
                  <Avatar name={comment.user.name} avatarUrl={comment.user.avatarUrl} size="sm" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <Link to={`/perfil/${comment.user.username}`} className="font-semibold hover:underline">
                      {comment.user.name}
                    </Link>{" "}
                    <span className="text-stone-500">
                      · <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
                    </span>
                  </p>
                  <p className="mt-1 whitespace-pre-line break-words text-stone-800">{comment.content}</p>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment)}
                      className="mt-1 text-xs font-medium text-stone-500 hover:text-red-700"
                    >
                      Apagar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {nextCursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-5 text-sm font-medium text-brand-700 hover:underline disabled:opacity-60"
        >
          {loadingMore ? "Carregando…" : "Ver comentários mais antigos"}
        </button>
      )}
    </section>
  );
}
