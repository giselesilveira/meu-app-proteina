# DEPLOY

## Visão geral

| Peça | Onde |
|---|---|
| App (Next.js 15, App Router) | Vercel |
| Banco, login, RLS | Supabase (região São Paulo) |
| Compras | Hotmart → `POST {NEXT_PUBLIC_APP_URL}/api/webhooks/hotmart` |
| E-mails | SMTP próprio no Supabase (código de login) + Resend (boas-vindas, opcional) |

Sem App Store ou Google Play: o app é um **PWA** e pode ser instalado pela tela inicial.

## Ordem segura de publicação (sem afetar a produção atual)

1. O trabalho está na branch **`black-app-2026`**. A `main` (calculadora atual) continua igual.
2. Na Vercel, cada push da branch gera um **Preview Deployment** com URL própria. Cadastre as
   variáveis também para **Preview** e teste tudo nessa URL. Para o Preview, use um projeto
   Supabase de teste ou o de produção antes do lançamento.
3. Quando estiver aprovado: abra um Pull Request `black-app-2026 → main` e faça o merge. A Vercel
   publica a produção sozinha.
4. Se precisar voltar atrás: Vercel → Deployments → deploy anterior → **Promote to Production**.

## Domínio: app em `nutrigiselesilveira.com.br/app`

O site principal (`nutrigiselesilveira.com.br`) já existe em outra hospedagem. Existem duas
formas de servir o app em `/app`:

### Opção A (recomendada, mais simples): subdomínio + redirecionamento
1. Vercel → Project → **Settings → Domains → Add** → `app.nutrigiselesilveira.com.br`.
   A Vercel mostra um registro **CNAME** (`cname.vercel-dns.com`): cadastre-o no DNS do domínio.
2. Variáveis: `NEXT_PUBLIC_APP_URL=https://app.nutrigiselesilveira.com.br` e
   `NEXT_PUBLIC_BASE_PATH=` (vazio). Faça o redeploy.
3. No site principal (WordPress ou similar), crie um redirecionamento 301 de `/app` para
   `https://app.nutrigiselesilveira.com.br` (ex.: plugin "Redirection").
4. Supabase → Authentication → URL Configuration: Site URL e Redirect URLs com o subdomínio.
5. Webhook Hotmart: `https://app.nutrigiselesilveira.com.br/api/webhooks/hotmart`.

### Opção B: subcaminho real `/app` (proxy reverso)
Use se o endereço precisa ser exatamente `nutrigiselesilveira.com.br/app`. O app já está
preparado: `NEXT_PUBLIC_BASE_PATH=/app` faz todas as rotas, ícones, manifest e service worker
ficarem em `/app`.
1. Mantenha `NEXT_PUBLIC_BASE_PATH=/app` e `NEXT_PUBLIC_APP_URL=https://nutrigiselesilveira.com.br/app`.
   O app fica acessível em `https://SEU-PROJETO.vercel.app/app`.
2. Na frente do site principal, encaminhe **`/app` e `/app/*`** para
   `https://SEU-PROJETO.vercel.app/app/*`, preservando caminho, query string, cookies e o header
   `X-HOTMART-HOTTOK`. Exemplos:
   - **Cloudflare (se o DNS do domínio está na Cloudflare):** Workers → Create → cole e associe à
     rota `nutrigiselesilveira.com.br/app*`:
     ```js
     const ORIGIN = "SEU-PROJETO.vercel.app";
     export default {
       async fetch(request) {
         const url = new URL(request.url);
         const publicHost = url.hostname;
         url.hostname = ORIGIN;
         const res = await fetch(new Request(url, request), { redirect: "manual" });
         // redirecionamentos do app devem continuar no domínio público
         const location = res.headers.get("location");
         if (!location || !location.includes(ORIGIN)) return res;
         const out = new Response(res.body, res);
         out.headers.set("location", location.replace(ORIGIN, publicHost));
         return out;
       },
     };
     ```
   - **Nginx:** `location /app { proxy_pass https://SEU-PROJETO.vercel.app; proxy_set_header Host SEU-PROJETO.vercel.app; proxy_ssl_server_name on; }`
3. Hospedagens compartilhadas de WordPress normalmente **não** permitem proxy reverso. Nesse
   caso, use a Opção A.

## Pós-deploy (checklist)

- [ ] `GET {APP_URL}/api/webhooks/hotmart` responde `{"ok":true,"endpoint":"hotmart-webhook"}`
- [ ] `{APP_URL}/manifest.webmanifest` abre e os ícones carregam
- [ ] Login com código chega em menos de 1 minuto (SMTP próprio configurado)
- [ ] Admin abre para os e-mails de `ADMIN_EMAILS`
- [ ] HOTMART_PURCHASE_TEST.md e HOTMART_REFUND_TEST.md executados
- [ ] Vercel → Settings → **Deployment Protection**: libere o Preview só para a equipe, se quiser

## Logs

- Vercel → Project → **Logs**: erros do servidor aparecem com prefixos `[hotmart]`,
  `[access]`, `[action:…]`, `[admin…]`. As alunas nunca veem esses detalhes.
- Supabase → **Logs** → Auth (envio de códigos) e Postgres.
- Admin do app → **Eventos Hotmart**: cada webhook com status `processed`, `ignored` ou `failed`
  e o motivo.
