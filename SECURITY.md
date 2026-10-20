# SECURITY: checklist de segurança e privacidade

## Controles implementados

| Área | Controle | Onde |
|---|---|---|
| Autenticação | Login sem senha (código OTP por e-mail; link mágico como alternativa), sessão em cookie httpOnly via `@supabase/ssr`, validada no servidor com `auth.getUser()` | `app/entrar`, `lib/supabase/*`, `middleware.ts` |
| Acesso | Direito de uso vem **só** do entitlement (compra Hotmart ou liberação manual). Criar conta não libera nada | `claim_my_entitlements()`, `has_active_access()` |
| Proteção de rotas | Centralizada em `lib/access.ts` (`requireAccess`, `accessForAction`, `requireAdmin`) e chamada em **cada** página, ação e rota de API | `lib/access.ts` |
| Banco | **RLS em todas as tabelas**. Dados da aluna: só `user_id = auth.uid()` **e** acesso ativo. Anônimo: nenhum acesso. `webhook_events` e `admin_audit_log`: sem acesso para alunas | `supabase/migrations/…_init.sql` |
| Integridade nutricional | Snapshot preenchido pelo **banco** a partir do catálogo (o cliente não consegue mandar valores próprios); valores por 100 g congelados na edição | trigger `food_entries_snapshot` |
| E-mail da compra | Aluna não pode alterar o e-mail (privilégio de coluna) | `grant update (full_name, timezone, onboarding_completed_at)` |
| Admin | Somente e-mails de `ADMIN_EMAILS` com e-mail confirmado, verificado no servidor em layout **e** em cada página/ação. Toda ação vai para `admin_audit_log` | `app/admin/*` |
| Service role | Só no servidor (`lib/supabase/admin.ts` importa `server-only`). Não existe `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | — |
| Webhook | Header `X-HOTMART-HOTTOK` comparado em tempo constante; sem hottok configurado recusa tudo; lista de produtos (e ofertas) permitidos; limite de 256 KB; idempotência por id do evento e por transação; proteção contra eventos fora de ordem | `lib/hotmart/*` |
| LGPD | Armazena só o necessário: e-mail, nome, peso, medidas e registros alimentares. Payload Hotmart salvo **sem** CPF, endereço, telefone, PIX/boleto. Analytics interno sem dados sensíveis. Nenhum diagnóstico, prescrição ou sugestão clínica | `redactPayload`, `lib/analytics.ts` |
| Erros | Mensagens amigáveis para a aluna; detalhes técnicos só no log do servidor | `app/error.tsx`, actions |
| Headers | HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; `poweredByHeader` desligado | `next.config.ts` |
| PWA | O service worker **não** guarda páginas nem dados pessoais em cache, só arquivos estáticos | `public/sw.js` |
| Dependências | Next.js 15.5 (corrige CVE-2025-29927 do 15.1.6 anterior); `npm audit --omit=dev` sem vulnerabilidades | `package.json` |

## Testes de segurança automatizados

- `tests/db/rls.test.ts` (PostgreSQL real): isolamento entre alunas (ler, alterar, apagar,
  favoritar em nome de outra), anônimo sem acesso, aluna sem compra sem acesso, revogação
  bloqueia e preserva dados, expiração, e-mail imutável, aluna não cria entitlement, funções
  internas não expostas, snapshot à prova de adulteração.
- `tests/hotmart.test.ts`: hottok inválido ou ausente, produto/oferta não permitidos,
  duplicidade, reprocessamento, ordem dos eventos, remoção de dados pessoais.

## Checklist antes de publicar

- [ ] `SUPABASE_SERVICE_ROLE_KEY` cadastrada **só** na Vercel (nunca no código, no GitHub ou com `NEXT_PUBLIC_`)
- [ ] `HOTMART_HOTTOK` igual ao da Hotmart; `HOTMART_ALLOWED_PRODUCT_UCODES` só com o produto da Maratona
- [ ] `ADMIN_EMAILS` só com as pessoas da equipe
- [ ] Supabase → Authentication → **Confirm email** ligado; SMTP próprio configurado
- [ ] Supabase → Authentication → URL Configuration só com o domínio do app
- [ ] Supabase → Database → Advisors / Security: sem alertas de "RLS disabled"
- [ ] `PRIVACY_POLICY_URL` e `TERMS_URL` preenchidos (a política deve citar os dados coletados: e-mail, nome, peso, medidas e registros alimentares, com a finalidade de acompanhamento na Maratona)
- [ ] Testes: `npm run lint && npm run typecheck && npm run test && npm run build`

## Pontos de atenção (decisões conscientes)

- **Cadastro aberto no Supabase Auth:** qualquer e-mail pode pedir código (necessário para quem
  comprou e ainda não entrou). Isso **não** dá acesso a nada sem entitlement, e a resposta é a
  mesma para qualquer e-mail (não revela quem comprou). Os limites de envio do Supabase
  protegem contra abuso.
- **Registros próprios via API:** a aluna, autenticada, poderia chamar a API diretamente para
  criar registros dela mesma, mas os valores nutricionais são sempre recalculados pelo banco.
- **Dados de alunas revogadas** ficam guardados (exigência do produto). Para atender um pedido
  de exclusão (LGPD), apague o usuário em Supabase → Authentication → Users: os dados ligados a
  ele são apagados em cascata. O entitlement fica (sem `user_id`) como registro da compra.

## Como relatar um problema de segurança

Escreva para o suporte (`SUPPORT_EMAIL`) com o assunto "Segurança – App Maratona 21". Não abra
issue pública com detalhes.
