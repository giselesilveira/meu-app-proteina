# App Maratona 21

**Seu painel diário de progresso.** Aplicativo das alunas da *Maratona de Emagrecimento de 21
Dias* da Nutricionista Gisele Silveira (campanha Black do Emagrecimento).

> Antes ela calculava. Agora ela acompanha.

Evolução da antiga Calculadora de Proteína (ver `PROJECT_AUDIT.md`): login sem senha, acesso
liberado automaticamente pela compra na Hotmart, dados salvos, histórico, evolução corporal,
catálogo oficial da TACO e painel administrativo. Funciona como PWA (instalável no iPhone e no
Android) e no desktop.

## Documentação

| Arquivo | Para quê |
|---|---|
| [SETUP.md](SETUP.md) | Passo a passo **não técnico**: Supabase, Vercel e variáveis |
| [DEPLOY.md](DEPLOY.md) | Publicação, domínio `/app`, logs |
| [HOTMART_SETUP.md](HOTMART_SETUP.md) | Webhook 2.0.0: eventos, payload, hottok, configuração e testes |
| [HOTMART_PURCHASE_TEST.md](HOTMART_PURCHASE_TEST.md) | Checklist da compra de teste |
| [HOTMART_REFUND_TEST.md](HOTMART_REFUND_TEST.md) | Checklist do reembolso |
| [TACO_SETUP.md](TACO_SETUP.md) | Fonte nutricional oficial, normalização e importação |
| [TACO_VALIDATION.md](TACO_VALIDATION.md) | Conferência dos dados com o PDF oficial |
| [FOOD_CATALOG_AUDIT.md](FOOD_CATALOG_AUDIT.md) | Alimentos da calculadora antiga × TACO |
| [SECURITY.md](SECURITY.md) | Controles de segurança, LGPD e checklist |
| [PROJECT_AUDIT.md](PROJECT_AUDIT.md) | Auditoria do projeto original |

## Stack

Next.js 15.5 (App Router) · React 19 · TypeScript · Tailwind CSS 3.4 · Supabase (Postgres,
Auth, RLS) · Vercel · Zod · Vitest.

## Estrutura

```
app/
  (app)/            telas da aluna: Hoje (/), registrar, historico, evolucao, perfil + actions.ts
  admin/            painel admin (alunas e acessos, catálogo, eventos Hotmart) + actions.ts
  entrar/           login sem senha (código por e-mail)
  boas-vindas/      onboarding
  sem-acesso/       e-mail sem compra / acesso revogado
  api/webhooks/hotmart/   webhook Hotmart
  api/foods/search/       busca no catálogo (servidor)
  auth/confirm, auth/sair
components/         UI (anel de progresso, lista de registros, busca, gráficos…)
lib/
  nutrition.ts      ÚNICO lugar dos cálculos (meta, proporcional, arredondamento)
  access.ts         proteção central de rotas (sessão + entitlement + admin)
  hotmart/          validação, schema, processamento idempotente
  dates.ts          datas no fuso da aluna
  csv.ts            validação do CSV de alimentos
supabase/
  migrations/       tabelas, funções, triggers e RLS
  seed/             carga da TACO (gerada)
  templates/        e-mail do código de acesso
data/taco/          planilha e PDF oficiais da TACO + catálogo gerado
scripts/            build/validação/importação da TACO, CSV, ícones
tests/              unitários (Vitest) e de banco (tests/db, PostgreSQL real)
```

## Regras de negócio e decisões

- **Meta de proteína** = peso (kg) × fator (1,5 / 1,8 / 2,0). O app **não recomenda** fator:
  "Escolha a meta indicada pela Nutri Gisele". Novo peso no check-in **pergunta** antes de
  recalcular ("Recalcular" ou "Manter meta atual"), e só quando é o check-in mais recente.
- **Nutrientes** guardados por 100 g. Consumido = valor/100 × gramas (`lib/nutrition.ts`; o
  banco usa a mesma fórmula no trigger, e os testes garantem que os dois coincidem).
- **Arredondamento** (só na exibição; o banco guarda 3 casas): proteína, gordura e
  carboidrato com **1 casa decimal**; calorias **inteiras**; arredondamento "meio para cima".
  Totais do dia somam os valores não arredondados.
- **Snapshot**: cada registro guarda nome, preparação, valores por 100 g, totais e fonte do
  momento do registro. Mudar o catálogo nunca altera o histórico.
- **Fuso horário**: padrão `America/Sao_Paulo` (campo `profiles.timezone`). A data do
  registro (`entry_date`) é calculada no servidor **no fuso da aluna**, nunca em UTC. Um
  registro às 23h50 fica no mesmo dia. Check-ins sugeridos: segunda e sexta (sem bloquear os
  outros dias).
- **Metas de calorias e gordura** são opcionais. Sem meta, o app mostra só o consumo.
- **Histórico**: a meta exibida em cada dia é a meta vigente naquele dia
  (`nutrition_target_history`).
- **Fonte nutricional**: TACO 4ª ed. (590 alimentos ativos). Produtos de marca: rótulo
  (`label`). Itens validados pela equipe: `manual_authorized`. Nada é estimado.
- **Analytics** interno e mínimo (`analytics_events`): `app_login`, `onboarding_completed`,
  `food_added`, `favorite_added`, `body_checkin_added`.

## Comandos

```bash
npm install
npm run dev          # desenvolvimento
npm run lint         # ESLint
npm run typecheck    # TypeScript
npm run test         # testes unitários
npm run test:db      # testes de banco (DATABASE_URL_TEST=postgres://…)
npm run build        # build de produção
npm run taco:build | taco:validate | taco:import
npm run foods:import-csv -- arquivo.csv [--aplicar]
```
