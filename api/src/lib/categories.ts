// Lista fixa de categorias: facilita filtrar e evita "Doce", "doces", "Doces " como coisas diferentes.
// O front tem uma cópia desta lista em web/src/lib/recipes.ts — mantenha as duas iguais.
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
