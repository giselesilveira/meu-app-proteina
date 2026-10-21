# ACCESS_EXPIRATION: prazo de acesso de 6 meses

## Regra

| Situação | Comportamento |
|---|---|
| Compra aprovada (Hotmart) | Acesso até o **fim do dia** em que se completam **6 meses de calendário** desde a **aprovação real** (`purchase.approved_date`), no fuso de São Paulo. Sem `approved_date`, usa a data do evento |
| Fim de mês | 31/08/2026 → até 28/02/2027; 31/08/2027 → até 29/02/2028 (bissexto); 31/12 → 30/06 |
| Reenvio, evento duplicado, `PURCHASE_COMPLETE` | Não alteram o vencimento |
| Reembolso, chargeback, cancelamento | Revogam o acesso (o vencimento fica guardado) |
| Reativação da mesma compra | Mantém o vencimento original. Se ele já passou, a compra volta a "ativa" mas sem acesso; o admin pode prorrogar |
| Nova compra (outra transação) | Novo período de 6 meses a partir da aprovação dela. O acesso anterior não é reduzido; vale o vencimento mais distante |
| Acesso manual (admin) | Data de término opcional, escolhida pelo admin (acesso até o fim do dia escolhido) |
| Prorrogação (admin) | Nova data a partir de hoje, posterior ao vencimento atual, no máximo 24 meses à frente; com motivo; registrada em `admin_audit_log`. Acessos revogados precisam ser reativados antes |

Técnico: `access_expires_at` guarda o instante **exclusivo** de término (00h00 de São Paulo do dia
seguinte ao último dia). O banco libera o acesso enquanto `access_expires_at > agora`
(`has_access_for`). A regra está em `lib/access-period.ts` e, igual, em
`public.access_period_end()`; os testes de banco garantem que as duas coincidem.

## Compras sobrepostas: decisão e motivo

**Adotado:** cada compra tem o próprio período, contado da aprovação dela. Os períodos não se
somam: vale o vencimento mais distante entre os acessos ativos.

**Alternativa não adotada:** somar o novo período ao fim do período atual (6 + 6 meses). Ela
cria uma brecha: comprar de novo e pedir reembolso da primeira compra dentro da garantia
preservaria o período estendido sem pagamento. Para evitar isso seria preciso recalcular os
períodos a cada reembolso, o que é mais complexo e mais sujeito a erro. Se a equipe quiser somar
períodos de compras renovadas, use **Prorrogar** no admin, caso a caso.

## Migração (banco de produção): aguarda aprovação

Arquivo: `supabase/migrations/20261022000001_access_expiration.sql`.

1. **Antes**, rode no SQL Editor (somente leitura): `supabase/manual/preview_access_expiration.sql`.
   Ele lista cada acesso Hotmart sem vencimento, a data de aprovação usada e o "acesso até".
2. Confira que a compra de teste real aparece com a data de aprovação esperada.
3. Aplique a migração (SQL Editor → cole o arquivo → Run). Ela:
   - adiciona a coluna `entitlements.purchase_approved_at` (nula, sem impacto nos dados atuais);
   - cria a função `public.access_period_end()` (só para o servidor);
   - preenche `purchase_approved_at` dos acessos Hotmart existentes com a `approved_date` do
     evento de compra já recebido (ou, se não houver, com a data de liberação);
   - preenche `access_expires_at` **somente onde está vazio**: nunca altera nem prorroga um
     vencimento existente; acessos manuais não são tocados.
4. É idempotente: rodar de novo não muda nada.
5. **Ordem com o deploy:** não importa. O código funciona com ou sem a migração: sem ela, o
   webhook continua liberando acesso e gravando o vencimento de 6 meses; só não guarda a data de
   aprovação. Aplicar a migração completa o preenchimento da compra de teste já existente.

Impacto esperado hoje: 1 acesso Hotmart (a compra de teste real) passa a ter vencimento em
aprovação + 6 meses. Nenhum acesso é criado, removido ou revogado.
