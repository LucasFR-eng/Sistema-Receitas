import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";

// Protege telas que exigem login: quem não está logado vai para /entrar
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return children;
}

export function PageLoading() {
  return <p className="px-4 py-20 text-center text-stone-500">Carregando…</p>;
}
