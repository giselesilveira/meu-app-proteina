# E2E_REPORT: simulação completa da jornada da aluna

Executada em 20/10/2026 contra uma pilha local equivalente ao Supabase (PostgreSQL 16 +
PostgREST 12.2 + Supabase Auth v2.170 + SMTP de teste), com o **build de produção** do app
(`next build` + `next start`, `NEXT_PUBLIC_BASE_PATH=/app`), no navegador Chromium simulando
**iPhone 13** (fuso America/Sao_Paulo), **Pixel 7** e desktop 1280 px.

Resultado: **39 de 39 verificações aprovadas.**

```
✔ webhook com hottok errado recusado (401)
✔ produto não liberado é ignorado
✔ compra aprovada processada
✔ reenvio do mesmo evento é idempotente
✔ entitlement ativo, e-mail normalizado, sem user_id antes do login
✔ evento salvo sem CPF
✔ entitlement associado ao usuário no primeiro login
✔ onboarding mostra meta 70 × 1,8 = 126 g
✔ pré-cálculo: 120 g de peito grelhado = 38,4 g proteína / 191 kcal / 3 g gordura
✔ favoritado
✔ Hoje: consumido 51,7 g (38,4 + 13,3), faltam 74,3 g
✔ favorito aparece na tela Hoje
✔ alteração no catálogo não muda o histórico (snapshot)
✔ edição: 150 g → 48 g de proteína (snapshot 32 g/100 g)
✔ exclusão de registro próprio
✔ novo peso: app pergunta antes de recalcular
✔ meta recalculada: 68 × 1,8 = 122,4 g
✔ check-in com data passada não pede recálculo
✔ Manter meta atual não altera a meta
✔ peso igual ao da meta não pergunta nada
✔ gráfico de peso: primeiro 70 → atual 68, diferença −2 kg
✔ perfil mostra e-mail da compra (não editável)
✔ logout
✔ novo login: dados continuam salvos (48 g, meta 122,4 g)
✔ webhook de reembolso processado
✔ entitlement revogado
✔ acesso bloqueado com mensagem amigável
✔ API também bloqueia após revogação
✔ dados preservados no banco após reembolso
✔ aprovação antiga reenviada não reativa
✔ reativação devolve acesso aos mesmos dados
✔ e-mail sem compra: tela amigável
✔ botão Falar com o suporte
✔ usuária comum não acessa /admin
✔ admin vê a aluna e a transação
✔ acesso manual registrado com responsável
✔ admin cadastra alimento de rótulo com responsável e porção
✔ aluna encontra o alimento de rótulo na busca
✔ admin vê eventos de webhook
E2E COMPLETO ✅
```

Problemas encontrados pela simulação e já corrigidos no código:
- rótulo de acessibilidade duplicado na busca de alimentos;
- a pergunta "Deseja recalcular sua meta…" não reaparecia num segundo check-in;
- um check-in com data passada pedia para recalcular a meta com um peso antigo (agora só
  pergunta para o check-in mais recente);
- comparação de peso com erro de ponto flutuante (67,9 × 68).

Pelo teste de banco (`tests/db/rls.test.ts`) também foi encontrada e corrigida uma função
interna (`has_access_for`) que ficava executável por alunas, por causa do privilégio padrão do
Supabase.
