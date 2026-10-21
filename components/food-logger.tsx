"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { addFoodEntry, toggleFavorite } from "@/app/(app)/actions";
import { consumedFor, format, parseDecimal } from "@/lib/nutrition";
import { withBasePath } from "@/lib/public-config";
import { MEALS, type FoodItem, type Meal } from "@/lib/types";
import { IconChevronLeft, IconSearch, IconStar } from "./icons";
import { Button, ButtonLink, Notice, Spinner } from "./ui";

const QUICK_AMOUNTS = [50, 100, 150, 200];

function sourceLabel(food: FoodItem) {
  if (food.source_type === "TACO") return `TACO${food.taco_code ? ` nº ${food.taco_code}` : ""}`;
  if (food.source_type === "label") return `Rótulo${food.brand ? ` · ${food.brand}` : ""}`;
  return "Validado pela equipe";
}

export function FoodLogger(props: {
  date: string;
  isToday: boolean;
  favorites: FoodItem[];
  recents: FoodItem[];
  favoriteIds: string[];
  initialFood: FoodItem | null;
  loadError: boolean;
}) {
  const [selected, setSelected] = useState<FoodItem | null>(props.initialFood);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(props.favoriteIds);
  const [added, setAdded] = useState<string | null>(null);

  if (selected) {
    return (
      <AmountPanel
        food={selected}
        date={props.date}
        isFavorite={favoriteIds.includes(selected.id)}
        onFavoriteChange={(fav) =>
          setFavoriteIds((ids) => (fav ? [...ids, selected.id] : ids.filter((id) => id !== selected.id)))
        }
        onBack={() => setSelected(null)}
        onAdded={(name) => {
          setAdded(name);
          setSelected(null);
        }}
        isToday={props.isToday}
      />
    );
  }

  return (
    <div className="space-y-6">
      {added ? (
        <div className="space-y-3">
          <Notice tone="success">
            <strong>{added}</strong> foi adicionado ao dia.
          </Notice>
          <div className="flex gap-2">
            <ButtonLink href={props.isToday ? "/" : `/historico/${props.date}`} variant="secondary" className="flex-1">
              Ver meu dia
            </ButtonLink>
          </div>
        </div>
      ) : null}
      {props.loadError ? <Notice tone="error">Não conseguimos carregar seus favoritos agora.</Notice> : null}
      <FoodSearch onSelect={setSelected} />
      <FoodGroup title="Favoritos" foods={props.favorites} onSelect={setSelected} />
      <FoodGroup title="Usados recentemente" foods={props.recents.filter((r) => !props.favorites.some((f) => f.id === r.id))} onSelect={setSelected} />
    </div>
  );
}

function FoodSearch({ onSelect }: { onSelect: (f: FoodItem) => void }) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodItem[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "offline">("idle");
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(null);
      setStatus("idle");
      return;
    }
    const timer = setTimeout(async () => {
      controller.current?.abort();
      const ac = new AbortController();
      controller.current = ac;
      setStatus("loading");
      try {
        const res = await fetch(withBasePath(`/api/foods/search?q=${encodeURIComponent(q)}`), { signal: ac.signal });
        if (res.status === 401) {
          window.location.href = withBasePath("/entrar");
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { foods: FoodItem[] };
        setResults(json.foods);
        setStatus("idle");
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setStatus(navigator.onLine ? "error" : "offline");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <section>
      <label htmlFor={inputId} className="label">
        Buscar alimento
      </label>
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-taupe" />
        <input
          id={inputId}
          type="search"
          autoComplete="off"
          enterKeyHint="search"
          placeholder="Ex.: frango grelhado, ovo, arroz"
          className="input pl-12"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div aria-live="polite" className="mt-3">
        {status === "loading" ? <Spinner label="Buscando…" /> : null}
        {status === "error" ? <Notice tone="error">Não conseguimos buscar agora. Tente novamente em instantes.</Notice> : null}
        {status === "offline" ? <Notice tone="error">Você está sem internet. Conecte-se para buscar alimentos.</Notice> : null}
        {results && status === "idle" ? (
          results.length === 0 ? (
            <div className="rounded-xl bg-sand/50 px-4 py-4 text-mute">
              Nenhum alimento encontrado para “{query.trim()}”. Tente outra palavra, como o nome principal do alimento.
            </div>
          ) : (
            <FoodList foods={results} onSelect={onSelect} />
          )
        ) : null}
      </div>
    </section>
  );
}

function FoodGroup({ title, foods, onSelect }: { title: string; foods: FoodItem[]; onSelect: (f: FoodItem) => void }) {
  if (foods.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      <FoodList foods={foods} onSelect={onSelect} />
    </section>
  );
}

function FoodList({ foods, onSelect }: { foods: FoodItem[]; onSelect: (f: FoodItem) => void }) {
  return (
    <ul className="card divide-y divide-sand/80 overflow-hidden">
      {foods.map((f) => (
        <li key={f.id}>
          <button
            type="button"
            onClick={() => onSelect(f)}
            className="flex min-h-[64px] w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-sand/40"
          >
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">{f.display_name}</span>
              <span className="block text-[0.9rem] text-mute">
                {f.category}
                {f.brand ? ` · ${f.brand}` : ""}
              </span>
            </span>
            <span className="tabular shrink-0 text-right text-[0.95rem] text-cocoa">
              <strong className="block text-[1.05rem] text-copper-dark">{format.protein(f.protein_per_100g)}</strong>
              <span className="text-[0.8125rem] text-taupe">prot./100 g</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function AmountPanel({
  food,
  date,
  isToday,
  isFavorite,
  onFavoriteChange,
  onBack,
  onAdded,
}: {
  food: FoodItem;
  date: string;
  isToday: boolean;
  isFavorite: boolean;
  onFavoriteChange: (fav: boolean) => void;
  onBack: () => void;
  onAdded: (name: string) => void;
}) {
  const router = useRouter();
  const amountId = useId();
  const [amount, setAmount] = useState(food.default_serving_g ? String(food.default_serving_g).replace(".", ",") : "");
  const [meal, setMeal] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [favPending, startFav] = useTransition();
  const grams = parseDecimal(amount);
  const valid = grams !== null && grams > 0 && grams <= 3000;
  const preview = valid ? consumedFor(food, grams) : null;

  const quick = [...(food.default_serving_g ? [food.default_serving_g] : []), ...QUICK_AMOUNTS].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  function add() {
    setError(null);
    if (!valid) return setError("Informe a quantidade em gramas.");
    startTransition(async () => {
      const res = await addFoodEntry({ foodId: food.id, amountG: grams!, meal, date });
      if (!res.ok) return setError(res.error);
      router.refresh();
      onAdded(food.display_name);
    });
  }

  function favorite() {
    startFav(async () => {
      const res = await toggleFavorite(food.id);
      if (res.ok && res.data) onFavoriteChange(res.data.favorite);
      else if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex min-h-[44px] items-center gap-1 font-semibold text-cocoa">
        <IconChevronLeft size={20} /> Voltar para a busca
      </button>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-serif text-[1.75rem] font-semibold leading-tight">{food.display_name}</h2>
            {food.preparation ? (
              <p className="mt-1 inline-block rounded-full bg-sand px-3 py-0.5 text-sm font-semibold capitalize text-cocoa">
                {food.preparation}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-mute">
              Fonte: {sourceLabel(food)}
              {food.taco_name && food.taco_name !== food.display_name ? ` — “${food.taco_name}”` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={favorite}
            disabled={favPending}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${
              isFavorite ? "border-copper bg-copper/10 text-copper" : "border-sand text-taupe hover:text-copper"
            }`}
          >
            <IconStar filled={isFavorite} />
          </button>
        </div>

        <div className="mt-5">
          <label htmlFor={amountId} className="label">
            Quantidade consumida (gramas)
          </label>
          <input
            id={amountId}
            className="input text-[1.4rem] font-bold"
            inputMode="decimal"
            placeholder="Ex.: 120"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            autoFocus
          />
          <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quantidades rápidas">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setAmount(String(q).replace(".", ","))}
                className="min-h-[44px] rounded-full border border-bark/15 bg-white px-4 text-[0.95rem] font-semibold text-cocoa hover:border-copper"
              >
                {format.grams(q)}
                {food.default_serving_g === q && food.serving_label ? ` (${food.serving_label})` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-xl bg-espresso p-4 text-cream" aria-live="polite">
          {preview ? (
            <dl className="grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-[0.8125rem] text-sand/75 min-[400px]:uppercase min-[400px]:tracking-[0.1em]">Proteína</dt>
                <dd className="tabular whitespace-nowrap text-[clamp(1rem,4.8vw,1.35rem)] font-bold text-gold">{format.protein(preview.protein)}</dd>
              </div>
              <div>
                <dt className="text-[0.8125rem] text-sand/75 min-[400px]:uppercase min-[400px]:tracking-[0.1em]">Calorias</dt>
                <dd className="tabular whitespace-nowrap text-[clamp(1rem,4.8vw,1.35rem)] font-bold">{format.calories(preview.calories)}</dd>
              </div>
              <div>
                <dt className="text-[0.8125rem] text-sand/75 min-[400px]:uppercase min-[400px]:tracking-[0.1em]">Gordura</dt>
                <dd className="tabular whitespace-nowrap text-[clamp(1rem,4.8vw,1.35rem)] font-bold">{preview.fat !== null ? format.fat(preview.fat) : "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-center text-sand/80">
              Em 100 g: {format.protein(food.protein_per_100g)} de proteína · {format.calories(food.calories_per_100g)}
            </p>
          )}
        </div>

        <fieldset className="mt-5">
          <legend className="label">Refeição (opcional)</legend>
          <div className="flex flex-wrap gap-2">
            {MEALS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={meal === m.value}
                onClick={() => setMeal(meal === m.value ? null : m.value)}
                className={`min-h-[44px] rounded-full border px-4 text-[0.95rem] font-semibold ${
                  meal === m.value ? "border-ink bg-ink text-cream" : "border-bark/15 bg-white text-cocoa"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        {error ? (
          <div className="mt-4">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}

        <Button onClick={add} loading={pending} disabled={!valid} className="mt-6 w-full text-[1.15rem]">
          Adicionar ao dia
        </Button>
        {!isToday ? (
          <p className="mt-2 text-center text-sm text-mute">
            Será registrado no dia selecionado. <Link href="/registrar" className="underline">Registrar para hoje</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
