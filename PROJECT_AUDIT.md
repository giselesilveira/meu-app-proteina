# PROJECT_AUDIT — Calculadora de Proteína → App Maratona 21

Auditoria feita **antes** de qualquer alteração, sobre o commit `be637ec`
("Update package.json", 19/01/2026) do repositório `giselesilveira/meu-app-proteina`.
O trabalho novo está na branch `black-app-2026`; a branch `main` (produção) não foi tocada.

## 1. Estrutura encontrada

```
app/
  page.tsx        ← toda a aplicação (componente client, 1 arquivo, ~170 linhas)
  layout.tsx      ← layout raiz com fonte Geist
  globals.css     ← Tailwind + variáveis de cor padrão do create-next-app
  favicon.ico
public/           ← SVGs padrão do create-next-app (não usados)
next.config.ts, tailwind.config.ts, postcss.config.mjs, eslint.config.mjs, tsconfig.json
package.json, package-lock.json, README.md (padrão do create-next-app)
```

| Item | Encontrado |
|---|---|
| Framework | Next.js com **App Router** (`app/`) |
| Linguagem | TypeScript (strict) |
| Estilo | Tailwind CSS 3.4 |
| Lint | ESLint 9 flat config (`FlatCompat` + `next/core-web-vitals`, `next/typescript`) |
| Banco de dados | **nenhum** |
| Autenticação | **nenhuma** |
| Integração Vercel | só o deploy (sem `vercel.json`, sem variáveis de ambiente usadas no código) |
| Testes | nenhum |
| PWA | não |

## 2. Versões — inconsistência importante

| Pacote | `package.json` | `package-lock.json` |
|---|---|---|
| next | **13.5.0** | **15.1.6** |
| react / react-dom | 18.2.0 | 19.0.0 |
| eslint-config-next | 13.5.0 | 15.x |
| tailwindcss | ^3.4.1 | 3.4.17 |
| eslint | ^8 | 9.20.1 |

O último commit trocou as versões no `package.json` para Next 13.5 / React 18, mas o lockfile
continua em Next 15.1.6 / React 19. Consequências:

- `npm ci` falha (lockfile fora de sincronia);
- com `npm install`, viria o Next 13.5, que **não aceita `next.config.ts`** (suportado só a partir
  do Next 15) e não tem a fonte `Geist` em `next/font/google`. O build quebraria;
- o Next 15.1.6 do lockfile tem a vulnerabilidade **CVE-2025-29927** (bypass de middleware),
  corrigida no 15.2.3. Isso é crítico para um app que protege rotas com middleware.

**Decisão:** padronizar em **Next.js 15.5 (linha LTS de manutenção, mesma major do lockfile)**,
React 19 e Tailwind 3.4 (mantido). Não subimos para Next 16 / Tailwind 4 para evitar
mudanças de configuração desnecessárias.

## 3. Funcionalidade existente

1. A aluna informa o peso (`input type=number`).
2. Escolhe o fator: 1,5 / 1,8 / 2,0 g/kg (`select`, padrão 1,5).
3. "Calcular" → `meta = peso × fator`, arredondada com `toFixed(1)`.
4. Uma lista com **todos os 26 alimentos** mostra um campo "Gramas" para cada um. Alguns
   também têm "Unidade", "Scoop" ou "Pote (200g)".
5. Total consumido = Σ (gramas/100 × proteína por 100 g) + Σ (unidades × proteína por unidade).
6. Mostra a meta e o total consumido. **Não mostra "quanto falta"** (o resumo do produto
   menciona isso, mas o código não calcula).

Nada fica salvo: ao recarregar a página, tudo é perdido.

## 4. Lista atual de alimentos (exportada do código)

| # | Nome antigo | Proteína/100 g | Proteína/unidade | Unidade |
|---|---|---|---|---|
| 1 | Atum Enlatado | 23 | – | – |
| 2 | Bife de Alcatra | 26 | – | – |
| 3 | Camarão | 20 | – | – |
| 4 | Carne Moída (Patinho) | 24 | – | – |
| 5 | Filé de Tilápia | 21 | – | – |
| 6 | Iogurte Grego | 10 | – | – |
| 7 | Lombo de Porco | 27 | – | – |
| 8 | Ovos Cozidos | 13 | 6 | unidade |
| 9 | Peito de Frango | 31 | – | – |
| 10 | Queijo Minas | 18 | 7 | unidade |
| 11 | Salmão Assado | 22 | – | – |
| 12 | Sardinha Lata | 24 | – | – |
| 13 | Tofu | 8 | – | – |
| 14 | Whey Protein | 80 | 20 | scoop |
| 15 | Ovos de Codorna | 13 | 1,3 | unidade |
| 16 | Iogurte do Tambo | 4,8 | 9,6 | pote 200 g |
| 17 | Proteína do Colágeno | 90 | 20 | scoop |
| 18 | Beef Protein | 90 | 25 | scoop |
| 19 | Clara de Ovo (de galinha) | 11 | 3,6 | unidade |
| 20 | Sobrecoxa de Frango | 25 | – | – |
| 21 | Coxa de Frango | 27 | – | – |
| 22 | Carne Moída | 26 | – | – |
| 23 | Peixe Cru (Sushi) | 20 | – | – |
| 24 | Carne de Porco | 27 | – | – |
| 25 | Coração de Frango | 28 | – | – |
| 26 | Fígado (Bovino) | 27 | – | – |

Só existe **proteína**: não há calorias, gorduras, preparação (cru/cozido/grelhado) nem
fonte dos dados. A comparação item a item com a TACO está em `FOOD_CATALOG_AUDIT.md`.

## 5. Lógica de cálculo — o que está correto e foi preservado

- `meta = peso_kg × fator` ✔ (regra de negócio confirmada; agora em `lib/nutrition.ts`).
- `proteína = gramas / 100 × proteína_por_100g` ✔ (mesma fórmula, centralizada).
- Fatores 1,5 / 1,8 / 2,0 ✔ (mantidos, sem recomendação automática).
- Arredondamento da meta em 1 casa decimal ✔ (mantido).

## 6. Pontos reaproveitados

- Fórmulas de meta e de proteína proporcional.
- Fatores e textos de seleção ("1,5 g/kg" …).
- Lista de 26 alimentos, usada como **lista de prioridade** para o catálogo e para os
  atalhos de busca (aliases). Os valores numéricos antigos **não** foram copiados:
  viraram referência de auditoria.
- Aviso de uso exclusivo das alunas (vai para a tela de login e para os termos).
- Configuração TypeScript (`@/*` alias), Tailwind 3 e ESLint flat config.

## 7. Pontos substituídos

| Antes | Depois |
|---|---|
| Valores digitados no componente React | Catálogo no banco (`food_catalog`), importado da TACO oficial |
| "Unidade/scoop/pote" fixos no código | Porção padrão (`default_serving_g`) por alimento; rótulos cadastrados pelo admin |
| Estado só em memória | Supabase (Postgres) com RLS |
| Sem login | Login sem senha (código por e-mail) + entitlement da compra |
| Uma página | App com Hoje, Registrar, Histórico, Evolução, Perfil e Admin |
| Paleta roxa/verde, emojis | Identidade Black do Emagrecimento (preto, cobre, creme) |
| `lang="en"` | `lang="pt-BR"` |

## 8. Dependências relevantes (novas)

- `@supabase/supabase-js`, `@supabase/ssr`: banco, auth e cookies de sessão.
- `zod`: validação de payloads (webhook, formulários, CSV).
- `vitest`: testes.
- `pg` (só dev/testes): testes de RLS contra um PostgreSQL real.
- `xlsx` (só dev, script de importação): leitura da planilha oficial TACO (`.xls`).

## 9. Riscos identificados

1. **Build atual quebrado/instável** por causa da divergência `package.json` × lockfile (item 2).
2. **CVE-2025-29927** no Next 15.1.6 do lockfile, resolvido com o upgrade para 15.5.
3. **Valores antigos sem fonte e sem preparação**: por exemplo, "Peito de Frango 31 g" não
   diz se é cru ou grelhado (na TACO, cru = 21,5 g e grelhado = 32,0 g). Os alimentos de rótulo
   (whey, colágeno, beef protein, Iogurte do Tambo) não têm marca nem rótulo de referência.
   Por isso eles **não entram** no catálogo até serem cadastrados a partir de um rótulo real.
4. **Login por link mágico em PWA no iPhone** abre o Safari em vez do app instalado. Por isso o
   fluxo principal usa **código de 6 dígitos** por e-mail, e o link continua como alternativa.
5. **Fuso horário**: registros perto da meia-noite em UTC. Resolvido com `entry_date` calculada
   em `America/Sao_Paulo` (ver `SECURITY.md` / `README.md`).
6. **Reenvio e ordem dos webhooks da Hotmart**: tratados com idempotência por id do evento e por
   transação, e com proteção contra eventos fora de ordem.
7. O domínio `meu-app-proteina.vercel.app` não pôde ser acessado desta sessão de
   desenvolvimento (bloqueio de rede). A auditoria foi feita pelo código-fonte do GitHub, que é
   a fonte do deploy.
