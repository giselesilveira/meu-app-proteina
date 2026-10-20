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
