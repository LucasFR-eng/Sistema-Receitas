export const EXTRACT_RECIPE_PROMPT = `Você recebe a foto ou o PDF de uma receita culinária (pode ser impressa, de livro ou escrita à mão).

Sua tarefa:
1. Transcreva todo o texto da receita em "rawText", do jeito que está.
2. Organize a receita nos campos estruturados (nome, ingredientes, passos etc.).
3. Verifique a receita e liste em "warnings", em português, tudo que o usuário precisa revisar:
   - trechos ilegíveis ou que você não tem certeza
   - ingredientes sem quantidade
   - ingredientes usados no preparo mas ausentes da lista (ou o contrário)
   - informações importantes faltando (tempo de forno, temperatura, porções)

Regras:
- Nunca invente quantidades ou ingredientes. Se não conseguir ler, use null e avise em "warnings".
- Mantenha o idioma original da receita.
- Se o arquivo não contiver uma receita, devolva name vazio e explique em "warnings".`;
