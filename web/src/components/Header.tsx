import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";

export function Header() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5">
      <Link to="/" className="text-xl font-bold tracking-tight">
        Recipe<span className="text-brand-600">Lens</span>
      </Link>

      {!loading && (
        <nav className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link
                to="/minhas-receitas"
                className="rounded-lg px-3 py-2 font-medium text-stone-700 transition hover:bg-stone-200"
              >
                Minhas receitas
              </Link>
              <span className="hidden text-stone-600 md:inline">@{user.username}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 font-medium text-stone-700 transition hover:bg-stone-200"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/entrar"
                className="rounded-lg px-3 py-2 font-medium text-stone-700 transition hover:bg-stone-200"
              >
                Entrar
              </Link>
              <Link
                to="/cadastro"
                className="rounded-lg bg-brand-600 px-3 py-2 font-medium text-white shadow-sm transition hover:bg-brand-700"
              >
                Criar conta
              </Link>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
