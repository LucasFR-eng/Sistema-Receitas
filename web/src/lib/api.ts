export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";

export type FieldErrors = Record<string, string[] | undefined>;

// Erro vindo da API, com a mensagem geral, os erros de cada campo e a resposta completa
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: FieldErrors = {},
    public readonly data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    // credentials: "include" envia e recebe o cookie de login
    response = await fetch(`${API_URL}${path}`, { ...init, credentials: "include" });
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua internet.", 0);
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(data.message ?? "Erro inesperado", response.status, data.fieldErrors, data);
  }

  return data as T;
}

export function api<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  return request<T>(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// Envia uma imagem e devolve o caminho onde ela ficou salva
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const data = await request<{ url: string }>("/uploads/images", { method: "POST", body: form });
  return data.url;
}
