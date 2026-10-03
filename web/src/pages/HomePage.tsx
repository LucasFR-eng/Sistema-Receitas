import { Link } from "react-router";
import { useAuth } from "../auth/AuthContext.tsx";

const features = [
  {
    title: "Fotografe ou envie um PDF",
    text: "A IA lê a receita, até escrita à mão, e preenche tudo para você.",
  },
  {
    title: "Revise antes de publicar",
    text: "A IA avisa o que ficou ilegível ou faltando. Você edita o que quiser.",
  },
  {
    title: "Compartilhe em tempo real",
    text: "Publique para todos ou guarde só para você. O feed atualiza na hora.",
  },
];

export function HomePage() {
  const { user } = useAuth();

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20 pt-12">
      <section className="max-w-2xl">
        {user && <p className="mb-3 font-medium text-brand-700">Olá, {user.name.split(" ")[0]}!</p>}
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Fotografe a receita. <span className="text-brand-600">A IA escreve.</span>
        </h1>
        <p className="mt-4 text-lg text-stone-600">
          Digitalize o caderno de receitas da família, organize as suas e descubra as de outras pessoas.
        </p>
        {user ? (
          <button
            type="button"
            disabled
            className="mt-8 rounded-lg bg-brand-600 px-5 py-3 font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            Nova receita (em breve)
          </button>
        ) : (
          <Link
            to="/cadastro"
            className="mt-8 inline-block rounded-lg bg-brand-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            Começar grátis
          </Link>
        )}
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-stone-200">
            <h2 className="font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-stone-600">{feature.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
