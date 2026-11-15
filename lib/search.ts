/** Normalização dos termos de busca de alimentos (o banco faz a mesma normalização). */
const STOPWORDS = new Set(["de", "da", "do", "das", "dos", "com", "e", "em", "a", "o", "ao", "na", "no"]);

export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Quebra a busca em termos e reduz plural/gênero simples
 * ("grelhada"/"grelhado" -> "grelhad", "ovos" -> "ovo"), para que a ordem das
 * palavras e o gênero não atrapalhem. Nunca troca uma palavra por outra.
 */
export function searchTokens(query: string): string[] {
  const words = normalizeText(query)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));
  const tokens = words.map((w) => {
    let t = w;
    if (t.length >= 4 && t.endsWith("s")) t = t.slice(0, -1);
    if (t.length >= 4 && /[ao]$/.test(t)) t = t.slice(0, -1);
    return t;
  });
  return [...new Set(tokens)].slice(0, 8);
}

/**
 * Filtra a lista completa de alimentos no navegador (catálogo pequeno).
 * Mesma regra do banco: todos os termos precisam aparecer no nome.
 * Ordem: nomes que começam com o texto digitado primeiro, depois alfabética.
 */
export function filterFoods<T extends { display_name: string }>(foods: T[], query: string): T[] {
  const sorted = [...foods].sort((a, b) => a.display_name.localeCompare(b.display_name, "pt-BR"));
  const tokens = searchTokens(query);
  if (tokens.length === 0) return sorted;
  const q = normalizeText(query.trim());
  return sorted
    .filter((f) => {
      const name = normalizeText(f.display_name);
      return tokens.every((t) => name.includes(t));
    })
    .sort((a, b) => Number(normalizeText(b.display_name).startsWith(q)) - Number(normalizeText(a.display_name).startsWith(q)));
}
