import type { Difficulty } from "../types.ts";
import { API_URL } from "./api.ts";

// Cópia da lista da API (api/src/lib/categories.ts) — mantenha as duas iguais
export const RECIPE_CATEGORIES = [
  "Bolos e tortas",
  "Doces e sobremesas",
  "Pães",
  "Salgados e lanches",
  "Massas",
  "Carnes",
  "Aves",
  "Peixes e frutos do mar",
  "Saladas",
  "Sopas e caldos",
  "Acompanhamentos",
  "Bebidas",
  "Café da manhã",
  "Fitness",
  "Vegetariana",
  "Vegana",
  "Outros",
] as const;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Fácil",
  MEDIUM: "Média",
  HARD: "Difícil",
};

// 50 -> "50 min", 90 -> "1h30", 120 -> "2h"
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
}

// Fotos ficam na API; o banco guarda só o caminho (/uploads/...)
export function mediaUrl(path: string): string {
  return `${API_URL}${path}`;
}
