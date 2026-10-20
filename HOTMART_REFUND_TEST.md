# HOTMART_REFUND_TEST: checklist de reembolso

Use a compra de teste do HOTMART_PURCHASE_TEST.md, já com alguns registros feitos no app.

| # | Passo | Como conferir | ✔ |
|---|---|---|---|
| 1 | Na Hotmart, **reembolsar** a compra de teste | Hotmart → Vendas → transação → Reembolsar | ☐ |
| 2 | **Evento recebido** | Admin → Eventos Hotmart: `PURCHASE_REFUNDED` com status `processed` | ☐ |
| 3 | **Transação encontrada** | O evento mostra a mesma transação `HP…` da compra | ☐ |
| 4 | **Entitlement revogado** | Admin → Alunas e acessos: status `revoked`, motivo `PURCHASE_REFUNDED`, data de revogação | ☐ |
| 5 | **Dados preservados** | Supabase → Table Editor → `food_entries` / `body_checkins`: os registros da aluna continuam lá | ☐ |
| 6 | **Próxima tentativa de acesso bloqueada** | No celular da aluna, abrir ou recarregar o app (mesmo já logada) | ☐ |
| 7 | **Mensagem amigável** | Aparece "Seu acesso não está mais ativo." e o botão **Falar com o suporte**, sem nenhum erro técnico | ☐ |

Extras (opcionais):
- **Chargeback:** mesmo resultado, com motivo `PURCHASE_CHARGEBACK`.
- **Reativação:** Admin → **Reativar** na linha da aluna → ela volta a entrar e encontra todos os
  dados antigos.
- **Reenvio antigo:** reenviar pela Hotmart o evento antigo de "compra aprovada" **não**
  reativa o acesso: o mesmo evento nunca é aplicado duas vezes (resposta `duplicate`), e eventos mais antigos que o último aplicado são ignorados.
