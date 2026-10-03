import { Link, useNavigate } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";
import { Avatar } from "./Avatar.tsx";

const navItemClass =
  "whitespace-nowrap rounded-lg px-2 py-2 font-medium text-stone-700 transition hover:bg-stone-200 sm:px-3";

export function Header() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-5">
      <Link to="/" className="text-xl font-bold tracking-tight">
        Recipe<span className="text-brand-600">Lens</span>
      </Link>

      {!loading && (
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {user ? (
            <>
              <Link to="/minhas-receitas" className={navItemClass}>
                {/* No celular só "Minhas", para caber numa linha */}
                <span className="sm:hidden">Minhas</span>
                <span className="hidden sm:inline">Minhas receitas</span>
              </Link>
              <Link to="/salvas" className={navItemClass}>
                Salvas
              </Link>
              <button type="button" onClick={handleLogout} className={navItemClass}>
                Sair
              </button>
              <Link
                to={`/perfil/${user.username}`}
                aria-label="Meu perfil"
                title="Meu perfil"
                className="ml-1 rounded-full transition hover:ring-2 hover:ring-brand-200 focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Avatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
              </Link>
            </>
          ) : (
            <>
              <Link to="/entrar" className={navItemClass}>
                Entrar
              </Link>
              <Link
                to="/cadastro"
                className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-2 font-medium text-white shadow-sm transition hover:bg-brand-700"
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
