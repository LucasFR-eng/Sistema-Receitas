export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  // Administrador: pode excluir qualquer receita ou usuário (só muda pelo banco)
  isAdmin: boolean;
  createdAt: string;
}

// Perfil que qualquer pessoa pode ver (sem e-mail)
export type PublicProfile = Omit<User, "email" | "isAdmin">;

export interface ProfileResponse {
  user: PublicProfile;
  stats: { recipesCount: number; favoritesReceived: number };
  isMe: boolean;
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
  favoritesCount: number;
  // Se o usuário logado salvou a receita (sempre false para quem não está logado)
  isFavorited: boolean;
}

export interface Recipe extends Omit<RecipeSummary, "user"> {
  freeText: string | null;
  // Receita em que esta se baseou ("Fazer minha versão"). Sem id/name quando a original não está mais visível
  basedOn: { author: { name: string; username: string }; id?: string; name?: string } | null;
  // Quantas versões públicas outras pessoas fizeram desta receita
  versionsCount: number;
  commentsCount: number;
  // Só vem para o dono da receita
  sourceText?: string | null;
  user: RecipeAuthor & { id: string };
  ingredients: { id: string; quantity: string | null; unit: string | null; item: string }[];
  steps: { id: string; description: string }[];
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: RecipeAuthor;
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
  // null no plano ilimitado
  limit: number | null;
  remaining: number | null;
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
  originalRecipeId?: string;
}
