import type { ReactNode } from "react";

// Moldura comum das telas de login e cadastro
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-md px-4 pb-20 pt-8">
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
      {message}
    </p>
  );
}

export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
    >
      {loading ? "Aguarde…" : children}
    </button>
  );
}
