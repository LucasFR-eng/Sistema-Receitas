import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-stone-600">Ela pode ter sido removida ou é privada.</p>
      <Link to="/" className="mt-6 inline-block font-medium text-brand-700 hover:underline">
        Voltar para o início
      </Link>
    </main>
  );
}
