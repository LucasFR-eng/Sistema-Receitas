export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type Visibility = "PUBLIC" | "PRIVATE";
export type RecipeStatus = "DRAFT" | "PUBLISHED";

export interface RecipeAuthor {
  name: string;
  username: string;
  avatarUrl: string | null;
}

// Versão resumida, usada nos cards das listas
export interface RecipeSummary {
  id: string;
  name: string;
  description: string | null;
  photoUrl: string | null;
  category: string | null;
  prepMinutes: number | null;
  servings: number | null;
  difficulty: Difficulty | null;
  visibility: Visibility;
  status: RecipeStatus;
  createdAt: string;
  updatedAt: string;
  user: RecipeAuthor;
}

export interface Recipe extends Omit<RecipeSummary, "user"> {
  freeText: string | null;
  // Só vem para o dono da receita
  sourceText?: string | null;
  user: RecipeAuthor & { id: string };
  ingredients: { id: string; quantity: string | null; unit: string | null; item: string }[];
  steps: { id: string; description: string }[];
}

// Receita lida pela IA, ainda não salva (o usuário revisa no formulário)
export interface RecipeDraft {
  name: string;
  description: string | null;
  category: string | null;
  prepMinutes: number | null;
  servings: number | null;
  difficulty: Difficulty | null;
  sourceText: string | null;
  ingredients: { quantity: string | null; unit: string | null; item: string }[];
  steps: string[];
}

export interface ImportUsage {
  used: number;
  limit: number;
  remaining: number;
}

export interface ImportResponse {
  import: { id: string; fileUrl: string | null; type: "IMAGE" | "PDF" | "TEXT"; fromCache: boolean };
  recipe: RecipeDraft;
  warnings: string[];
  usage: ImportUsage;
}

// Dados enviados para criar ou editar uma receita
export interface RecipeInput {
  name: string;
  description: string | null;
  photoUrl: string | null;
  category: string | null;
  prepMinutes: number | null;
  servings: number | null;
  difficulty: Difficulty | null;
  visibility: Visibility;
  status: RecipeStatus;
  freeText: string | null;
  sourceText: string | null;
  ingredients: { quantity: string | null; unit: string | null; item: string }[];
  steps: string[];
  allowDuplicate?: boolean;
  importId?: string;
}
