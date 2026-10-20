# HOTMART_SETUP: liberação automática de acesso

Fluxo: **Hotmart → `POST /api/webhooks/hotmart` → Supabase (entitlements)**. Não usa Make
nem Zapier.

## 1. O que a documentação oficial diz (Webhook versão 2.0.0)

Conferido em outubro/2026 na documentação da Hotmart para desenvolvedores
(https://developers.hotmart.com/docs/pt-BR/2.0.0/webhook/purchase-webhook/, página "Eventos de
compra"):

- **Autenticação:** cada requisição traz o header **`X-HOTMART-HOTTOK`** com o token único da
  sua conta (hottok). A Hotmart recomenda validar o token antes de processar qualquer dado.
  Para trocar o hottok, é preciso falar com o suporte da Hotmart.
- **Reenvio:** quando a URL não responde com sucesso, a Hotmart reenvia o evento
  automaticamente (até 5 vezes, segundo a Central de Ajuda). Também é possível reenviar
  manualmente pelo histórico. Se a URL falhar muitas vezes seguidas, a configuração pode ser
  desativada.
- **Envelope:** `{ "id", "creation_date" (ms), "event", "version": "2.0.0", "data": { … } }`.

### Eventos e o que o app faz

| Evento Hotmart | Significado | Ação no app |
|---|---|---|
| `PURCHASE_APPROVED` | Compra aprovada | **Libera** (cria ou reativa o entitlement) |
| `PURCHASE_COMPLETE` | Compra completa (fim da garantia) | **Libera** (idempotente) |
| `PURCHASE_REFUNDED` | Reembolso | **Revoga** |
| `PURCHASE_CHARGEBACK` | Chargeback | **Revoga** |
| `PURCHASE_CANCELED` | Compra cancelada | **Revoga** (se havia acesso dessa transação) |
| `PURCHASE_PROTEST` | Pedido de reembolso / disputa aberta | Só registra (revoga quando o reembolso for confirmado) |
| `PURCHASE_BILLET_PRINTED`, `PURCHASE_DELAYED`, `PURCHASE_EXPIRED` | Boleto gerado / atraso / expirado | Só registra |
| outros | — | Só registra (`ignored`) |

### Campos do payload usados

| Campo | Uso |
|---|---|
| `id` | id único do evento → **idempotência** (mesmo id = mesmo evento) |
| `event` | tipo do evento |
| `creation_date` | ordem dos eventos (um evento mais antigo não desfaz um mais novo) |
| `data.product.ucode` | precisa estar em `HOTMART_ALLOWED_PRODUCT_UCODES` |
| `data.purchase.offer.code` | se `HOTMART_ALLOWED_OFFER_CODES` estiver preenchido, precisa estar na lista |
| `data.purchase.transaction` | chave da transação (ex.: `HP17715690036014`) |
| `data.buyer.email` | e-mail que libera o acesso (normalizado: sem espaços e em minúsculas) |
| `data.buyer.ucode` | guardado no entitlement e no profile |
| `data.buyer.first_name` / `name` | usado só no e-mail de boas-vindas |

O payload é guardado em `webhook_events` **sem** CPF/documento, endereço, telefone, código
PIX/boleto e qualquer hottok.

### Respostas do endpoint

| HTTP | Quando | A Hotmart reenvia? |
|---|---|---|
| 200 `processed` / `ignored` / `duplicate` | evento tratado | não |
| 401 | hottok ausente ou errado | — |
| 400 | JSON inválido | — |
| 503 | `HOTMART_HOTTOK` não configurado no servidor | sim |
| 500 | erro temporário (ex.: banco fora) | **sim**, e o reenvio é processado normalmente |

## 2. Configuração dentro da Hotmart (passo a passo)

> Os nomes dos menus podem mudar um pouco. Procure por "Webhook" nas Ferramentas.

1. Entre na Hotmart como **produtora** → menu **Ferramentas** → **Webhook (API e notificações)**.
2. Copie o **Hottok** mostrado nessa área → Vercel → variável **`HOTMART_HOTTOK`**.
3. Clique em **Cadastrar webhook** (ou "+ Configuração"):
   - **Nome:** `App Maratona 21`
   - **URL:** `https://nutrigiselesilveira.com.br/app/api/webhooks/hotmart`
     (ou `https://app.nutrigiselesilveira.com.br/api/webhooks/hotmart`, se usar subdomínio:
     ver DEPLOY.md). A regra é sempre `[NEXT_PUBLIC_APP_URL]/api/webhooks/hotmart`.
   - **Versão:** **2.0.0**
   - **Produto:** selecione **somente** o produto da Maratona de Emagrecimento de 21 Dias.
   - **Eventos:** marque **Compra aprovada**, **Compra completa**, **Compra reembolsada**,
     **Chargeback**, **Compra cancelada** e **Pedido de reembolso / Disputa**.
4. Salve.

## 3. Descobrir o `ucode` do produto (e o código da oferta)

O jeito mais seguro é ver o que a Hotmart realmente envia:
1. Deixe `HOTMART_ALLOWED_PRODUCT_UCODES` **vazio** por enquanto (nenhum acesso é liberado
   assim, mas o evento fica registrado).
2. Faça a compra de teste (HOTMART_PURCHASE_TEST.md, passo 1).
3. No app: **Admin → Eventos Hotmart** → evento `PURCHASE_APPROVED` → **ver** → copie
   `data.product.ucode` e, se quiser filtrar ofertas, `data.purchase.offer.code`.
4. Vercel → `HOTMART_ALLOWED_PRODUCT_UCODES=<ucode>` (vários? separe por vírgula) → **Redeploy**.
5. Na Hotmart → histórico do webhook → **reenviar** o evento da compra de teste. Eventos que
   foram ignorados por falta de configuração são processados de novo, e agora o acesso é
   liberado. (Eventos já `processed` nunca são aplicados duas vezes.)

> Importante: o app **nunca** libera acesso para qualquer produto Hotmart, somente para os
> ucodes da lista. Lista vazia = nenhum produto libera.

## 4. Como testar

- **Teste rápido de saúde:** abra `[APP_URL]/api/webhooks/hotmart` no navegador → deve
  aparecer `{"ok":true,"endpoint":"hotmart-webhook"}`.
- **Botão de teste da Hotmart:** se houver, envia um evento de exemplo com dados fictícios.
  Ele deve aparecer em **Admin → Eventos Hotmart** como `ignored` (produto fictício). Isso
  prova que URL e hottok estão certos.
- **Compra real/teste:** HOTMART_PURCHASE_TEST.md.
- **Reembolso:** HOTMART_REFUND_TEST.md.
- **Teste manual com curl (equipe técnica):**
  ```bash
  curl -X POST "$APP_URL/api/webhooks/hotmart" \
    -H "Content-Type: application/json" -H "X-HOTMART-HOTTOK: $HOTMART_HOTTOK" \
    -d '{"id":"teste-1","creation_date":1767272400000,"event":"PURCHASE_APPROVED","version":"2.0.0",
         "data":{"product":{"id":1,"ucode":"SEU_UCODE"},"buyer":{"email":"teste@exemplo.com"},
         "purchase":{"transaction":"HP-TESTE-1","offer":{"code":"x"}}}}'
  ```

## 5. Onde ver os logs

- **Admin → Eventos Hotmart:** cada evento, status, tentativas, motivo e payload (sem dados
  sensíveis). Filtre por `failed` para ver erros.
- **Vercel → Logs:** mensagens `[hotmart] …`.
- **Hotmart → Webhook → Histórico:** status HTTP de cada envio e reenvio manual.

## 6. Casos especiais tratados

- **Compra antes do primeiro acesso:** o entitlement nasce só com o e-mail; no primeiro login
  com esse e-mail ele é associado à aluna.
- **E-mail com maiúsculas/espaços:** normalizado dos dois lados.
- **Evento repetido:** não duplica nada, nem reenvia o e-mail de boas-vindas.
- **Reembolso que chega antes da aprovação, ou aprovação antiga reenviada depois do
  reembolso:** não reativa (a ordem é decidida pelo `creation_date`).
- **Nova compra aprovada da mesma transação depois de revogada:** reativa.
- **Comprou com outro e-mail:** a aluna vê "Não encontramos um acesso ativo para este e-mail"
  e o botão de suporte. O admin pode liberar manualmente o e-mail correto.
