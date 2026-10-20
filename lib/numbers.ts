/** PostgREST devolve numeric como string: converte campos numéricos de uma linha. */
export function toNumbers<T extends object>(row: T, keys: (keyof T)[]): T {
  const out = { ...row } as Record<keyof T, unknown>;
  for (const k of keys) {
    const v = out[k];
    if (v !== null && v !== undefined) out[k] = Number(v);
  }
  return out as T;
}
