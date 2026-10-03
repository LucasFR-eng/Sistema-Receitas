import { useEffect, useState, type MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";
import { api } from "../lib/api.ts";

interface FavoriteButtonProps {
  recipeId: string;
  isFavorited: boolean;
  favoritesCount: number;
  // "card": coração redondo sobre a foto; "full": botão com texto, na página da receita
  variant?: "card" | "full";
}

export function FavoriteButton({ recipeId, isFavorited, favoritesCount, variant = "card" }: FavoriteButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [saved, setSaved] = useState(isFavorited);
  const [count, setCount] = useState(favoritesCount);
  const [pending, setPending] = useState(false);

  // Acompanha mudanças vindas de fora (ex: contagem atualizada pelo feed ao vivo)
  useEffect(() => {
    setSaved(isFavorited);
    setCount(favoritesCount);
  }, [isFavorited, favoritesCount]);

  async function toggle(event: MouseEvent) {
    event.preventDefault();
    if (!user) {
      navigate("/entrar", { state: { from: location.pathname } });
      return;
    }
    if (pending) return;

    // Atualização otimista: muda na tela na hora e desfaz se a API falhar
    const previous = { saved, count };
    setSaved(!saved);
    setCount(count + (saved ? -1 : 1));
    setPending(true);
    try {
      const result = await api<{ isFavorited: boolean; favoritesCount: number }>(`/recipes/${recipeId}/favorite`, {
        method: saved ? "DELETE" : "POST",
      });
      setSaved(result.isFavorited);
      setCount(result.favoritesCount);
    } catch {
      setSaved(previous.saved);
      setCount(previous.count);
    } finally {
      setPending(false);
    }
  }

  const label = saved ? "Remover dos salvos" : "Salvar receita";

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm ring-1 transition ${
          saved ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100" : "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50"
        }`}
      >
        <HeartIcon filled={saved} />
        {saved ? "Salva" : "Salvar"}
        {count > 0 && <span className="text-stone-500">· {count}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:scale-105 ${
        saved ? "text-red-600" : "text-stone-600"
      }`}
    >
      <HeartIcon filled={saved} />
      {count > 0 && <span>{count}</span>}
    </button>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
      />
    </svg>
  );
}
