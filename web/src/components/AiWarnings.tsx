// Avisos da IA sobre o que o usuário precisa revisar na receita lida
export function AiWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return (
      <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800 ring-1 ring-green-200">
        A IA não encontrou problemas. Mesmo assim, dê uma conferida antes de publicar.
      </div>
    );
  }

  return (
    <div role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
      <p className="font-semibold">A IA pediu para você conferir:</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {warnings.map((warning) => (
          <li key={warning}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
