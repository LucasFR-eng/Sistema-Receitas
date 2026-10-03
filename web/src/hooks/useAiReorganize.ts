import { useCallback, useState } from "react";
import { draftToFormValues, importFromText } from "../lib/imports.ts";

// "Reorganizar com IA": manda o texto livre para a IA e guarda os avisos da última leitura
export function useAiReorganize(initialWarnings: string[] | null = null) {
  const [warnings, setWarnings] = useState<string[] | null>(initialWarnings);

  const reorganize = useCallback(async (text: string) => {
    const response = await importFromText(text);
    setWarnings(response.warnings);
    return draftToFormValues(response.recipe);
  }, []);

  return { warnings, setWarnings, reorganize };
}
