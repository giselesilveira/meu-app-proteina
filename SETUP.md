# SETUP: como colocar o App Maratona 21 no ar (passo a passo, sem precisar programar)

Você vai precisar de **3 contas**: Supabase (banco de dados e login), Vercel (onde o app roda)
e Hotmart (que você já tem). O guia leva cerca de 40 minutos. Faça na ordem.

> Dica: abra um bloco de notas e vá colando nele cada chave que copiar. No fim, todas vão para
> a Vercel.

---

## PARTE 1: Supabase (banco de dados + login sem senha)

### 1.1 Criar o projeto
1. Entre em https://supabase.com e clique em **Start your project** (pode entrar com o GitHub).
2. Clique em **New project**.
3. Preencha:
   - **Name:** `maratona-21`
   - **Database Password:** clique em **Generate a password** e **guarde essa senha** no bloco de notas.
   - **Region:** `South America (São Paulo)`.
4. Clique em **Create new project** e espere uns 2 minutos até o painel abrir.

### 1.2 Criar as tabelas e as regras de segurança (migration + RLS)
1. No menu da esquerda, clique em **SQL Editor**.
2. Clique em **New query**.
3. No GitHub do projeto, abra o arquivo `supabase/migrations/20261020000001_init.sql`, clique
   em **Raw**, selecione tudo (Ctrl+A), copie e cole no SQL Editor.
4. Clique em **Run** (canto inferior direito). Deve aparecer **Success. No rows returned**.

Esse arquivo cria todas as tabelas e já liga a **RLS (Row Level Security)**: cada aluna só
enxerga os próprios dados, e só enquanto tiver acesso ativo. Não é preciso configurar nenhuma
política manualmente.

### 1.3 Carregar os alimentos da TACO
1. Ainda no **SQL Editor**, clique em **New query**.
2. Abra `supabase/seed/taco_food_catalog.sql` no GitHub → **Raw** → copie tudo → cole.
3. Clique em **Run**. Para conferir, rode numa nova query:
   `select count(*) from food_catalog;` O resultado deve ser **597**.

(Pode rodar esse arquivo de novo no futuro: ele atualiza, nunca duplica.)

### 1.4 Copiar as chaves
1. Menu da esquerda → **Project Settings** (engrenagem) → **API** (ou **Data API** / **API Keys**).
2. Copie para o bloco de notas:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - chave **anon / public** → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - chave **service_role / secret** → será `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ A **service_role** abre o banco inteiro. Nunca envie por WhatsApp/e-mail e nunca cole em
> lugar público. Ela só vai na Vercel.

### 1.5 Configurar o login por código (OTP)
1. Menu → **Authentication** → **Sign In / Providers** (ou **Providers**) → **Email**:
   - **Enable Email provider:** ligado.
   - **Confirm email:** ligado.
   - **Email OTP Expiration:** `3600` (1 hora).
   - Salve.
2. Menu → **Authentication** → **URL Configuration**:
   - **Site URL:** `https://nutrigiselesilveira.com.br/app`
   - **Redirect URLs** → **Add URL:** `https://nutrigiselesilveira.com.br/app/**`
   - Salve.
3. Menu → **Authentication** → **Email Templates**:
   - Abra **Magic Link**. Em **Subject** escreva `Seu código de acesso — App Maratona 21`.
     No corpo, apague tudo e cole o conteúdo de `supabase/templates/codigo-de-acesso.html`. Salve.
   - Abra **Confirm signup** e faça **exatamente o mesmo** (mesmo assunto e mesmo corpo).
   - Isso faz o e-mail trazer o **código de 6 dígitos** (`{{ .Token }}`), que funciona também no
     app instalado no iPhone.

### 1.6 E-mail profissional (SMTP): obrigatório para produção
O envio de e-mail embutido do Supabase permite pouquíssimos e-mails por hora, então as alunas
ficariam sem código. Configure um SMTP próprio. Exemplo com o Resend, que também serve para o
e-mail de boas-vindas:
1. Crie uma conta em https://resend.com → **Domains** → **Add Domain** → `nutrigiselesilveira.com.br`.
   O Resend mostra 3 ou 4 registros DNS: peça a quem cuida do domínio para cadastrá-los e espere
   ficar **Verified**.
2. Resend → **API Keys** → **Create API Key** → copie (será `RESEND_API_KEY`).
3. Supabase → **Authentication** → **Emails** / **SMTP Settings** → **Enable Custom SMTP**:
   - **Sender email:** `app@nutrigiselesilveira.com.br` · **Sender name:** `Maratona 21`
   - **Host:** `smtp.resend.com` · **Port:** `465` · **Username:** `resend` · **Password:** a API key do Resend.
   - Salve.
4. Supabase → **Authentication** → **Rate Limits**: aumente **Rate limit for sending emails**
   (ex.: 100 por hora) para o dia de abertura das inscrições.

---

## PARTE 2: Vercel (onde o app roda)

### 2.1 Importar o projeto
1. Entre em https://vercel.com com a conta do GitHub que tem o repositório
   `giselesilveira/meu-app-proteina`.
2. Se o projeto antigo (`meu-app-proteina`) já existe na Vercel, use o mesmo. Senão, clique em
   **Add New… → Project** e importe o repositório.
3. **Framework Preset:** Next.js (detectado sozinho). Não mude os comandos de build.

### 2.2 Cadastrar as variáveis
Vercel → seu projeto → **Settings** → **Environment Variables**. Cadastre uma por uma
(marque **Production** e **Preview**):

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase (1.4) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon (1.4) |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service_role (1.4) |
| `HOTMART_HOTTOK` | hottok da Hotmart (Parte 3) |
| `HOTMART_ALLOWED_PRODUCT_UCODES` | ucode do produto da Maratona (Parte 3) |
| `HOTMART_ALLOWED_OFFER_CODES` | deixe vazio, ou os códigos das ofertas que liberam acesso |
| `ADMIN_EMAILS` | `gisele@nutrigiselesilveira.com.br,alinenmaia@outlook.com` |
| `NEXT_PUBLIC_APP_URL` | `https://nutrigiselesilveira.com.br/app` |
| `NEXT_PUBLIC_BASE_PATH` | `/app` (veja o DEPLOY.md: se usar subdomínio, deixe vazio) |
| `SUPPORT_EMAIL` | `mentoriaemagrecimentoeficiente@gmail.com` |
| `SUPPORT_URL` | opcional (ex.: link do WhatsApp do suporte) |
| `PRIVACY_POLICY_URL` | link da política de privacidade no site |
| `TERMS_URL` | link dos termos de uso no site |
| `RESEND_API_KEY` | opcional: chave do Resend (1.6) |
| `EMAIL_FROM` | opcional: `Maratona 21 <app@nutrigiselesilveira.com.br>` |

Depois de salvar: **Deployments** → no último deploy, clique em **⋯ → Redeploy**.
(Variáveis que começam com `NEXT_PUBLIC_` só valem depois de um novo deploy.)

### 2.3 Domínio `/app`
Veja **DEPLOY.md**, seção "Domínio". Lá estão as duas formas de fazer o app abrir em
`nutrigiselesilveira.com.br/app`.

---

## PARTE 3: Hotmart
Siga o **HOTMART_SETUP.md** para cadastrar o webhook, copiar o hottok e descobrir o ucode do
produto. Depois teste com o **HOTMART_PURCHASE_TEST.md** e o **HOTMART_REFUND_TEST.md**.

---

## PARTE 4: Conferência final
1. Abra `https://nutrigiselesilveira.com.br/app`: deve aparecer a tela **Entrar**.
2. Entre com um dos e-mails de admin: sem compra, você é levada **direto ao painel**
   (`/admin`). Ser admin não libera as telas de aluna: para usar o app como aluna, libere um
   acesso manual para o próprio e-mail em **Liberar acesso manual**. Quem não é admin recebe
   "Página não encontrada" ao tentar abrir `/admin`.
3. Faça a compra de teste do HOTMART_PURCHASE_TEST.md.

---

## Para quem programa: ambiente local

```bash
npm install
cp .env.example .env.local      # preencha com um projeto Supabase de teste
npm run dev                     # http://localhost:3000/app (com NEXT_PUBLIC_BASE_PATH=/app)
npm run lint && npm run typecheck && npm run test && npm run build
```

Testes de banco (RLS, entitlements, snapshot) contra um PostgreSQL 15+ local:
```bash
DATABASE_URL_TEST=postgres://postgres@localhost:5432/postgres npm run test:db
```
O teste cria e apaga um banco temporário próprio, simulando os papéis do Supabase
(`supabase/tests/supabase_stub.sql`).

Scripts úteis: `npm run taco:build`, `npm run taco:validate`, `npm run taco:import`,
`npm run foods:import-csv -- arquivo.csv [--aplicar]`, `npm run icons`.
