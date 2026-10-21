# LEGAL_REVIEW: pendências antes de publicar os documentos legais

Páginas: `/politica-de-privacidade` e `/termos-de-uso` (públicas, sem login).
Enquanto `LEGAL_REVIEW_PENDING = true` em `components/legal-page.tsx`, as páginas mostram
"Versão preliminar, sujeita a revisão jurídica". Mude para `false` depois da revisão.

Os textos descrevem apenas o que o aplicativo faz hoje. Os pontos abaixo dependem de decisão
jurídica ou de implementação técnica.

## 1. Bloqueantes (resolver antes de publicar os documentos como definitivos)

| # | Ponto | Por quê | Ação |
|---|---|---|---|
| J1 | **Prazo de 6 meses: implementado na branch, falta aplicar em produção** | O código e a migração estão prontos (ver `ACCESS_EXPIRATION.md`). Até a migração ser aplicada e o código publicado, compras continuam sem data de término | Aprovar a migração e a publicação |
| J2 | **Base legal para dados de saúde** | A Política usa o art. 11, II, "d" e "f" (exercício regular de direitos em contrato e tutela da saúde por profissional de saúde). O enquadramento em "tutela da saúde" para um app de autoacompanhamento é discutível. **O app não coleta consentimento específico** (art. 11, I) | Advogada(o) decidir a base. Se for consentimento, implementar aceite específico e destacado no primeiro acesso, com registro de data e versão (seção 4, P1) |
| J3 | **Aceite dos Termos** | O texto diz "Ao entrar no aplicativo, você declara que leu e concorda". Não há caixa de aceite nem registro do aceite | Decidir se basta o aceite por navegação ou se haverá aceite explícito registrado |
| J4 | **Transferência internacional** | Supabase está em São Paulo. A Vercel executa o servidor, por padrão, nos EUA (não há `vercel.json` fixando a região). O provedor de e-mail (Resend) também é estrangeiro | Validar a redação do art. 33. Opcional: fixar a região `gru1` (São Paulo) na Vercel |
| J5 | **Endereço da empresa** | O Decreto 7.962/2013 (comércio eletrônico) pede endereço físico e eletrônico do fornecedor | Informar o endereço para incluir nos documentos |

## 2. Confirmar

- **Encarregado de dados (DPO):** a Política indica o e-mail de contato. Confirme se a empresa
  se enquadra como agente de pequeno porte (Resolução CD/ANPD nº 2/2022) ou se deve nomear
  encarregado.
- **Prazo de garantia na Hotmart:** os Termos citam o direito de arrependimento de 7 dias (CDC,
  art. 49) e "o prazo de garantia informado na página de compra". Confirme o prazo configurado.
- **Prazo de guarda dos registros de compra e dos dados após o fim do acesso:** não há prazo
  definido (seção 4, P3).
- **Comunicação de mudanças:** os documentos dizem que mudanças relevantes serão comunicadas
  "pelo aplicativo ou por e-mail". Hoje isso é feito manualmente.
- **Plano de resposta a incidentes (art. 48):** a Política cita a comunicação à ANPD e às
  titulares. Não há procedimento interno documentado.
- **Idade mínima de 18 anos:** declarada na Política. O app não verifica idade.

## 3. Prazo de acesso de 6 meses

Implementado na branch `black-app-2026`. Regras, decisão sobre compras sobrepostas e passo a passo
da migração estão em `ACCESS_EXPIRATION.md`.

## 4. Privacidade e dados sensíveis (LGPD)

O que já está adequado:
- Isolamento por aluna no banco (RLS), testado; visitante sem login não acessa nada.
- Minimização: o payload Hotmart é salvo sem CPF, endereço, telefone e códigos de pagamento.
- O admin não exibe registros alimentares, peso ou medidas das alunas; mostra só e-mail, nome e
  dados da compra.
- Sem ferramentas de rastreamento de terceiros; analytics interno sem conteúdo dos registros.
- O service worker não guarda páginas nem dados pessoais no aparelho.
- A aluna corrige nome, peso, metas e registros no próprio app.

Pendências:

| # | Pendência | Impacto | Recomendação |
|---|---|---|---|
| P1 | **Sem consentimento específico** para dados de saúde | Depende da base legal escolhida (J2) | Se a base for consentimento: aceite destacado no onboarding + registro (data, versão do texto); permitir revogação |
| P2 | **Exclusão só manual**, pelo painel do Supabase (Authentication → Users → excluir usuária). Não há botão no admin | Atendimento lento e sujeito a erro | Ação "Excluir dados da aluna" no admin, com confirmação e registro em `admin_audit_log` |
| P3 | **Sem prazo de retenção**: dados de alunas com acesso encerrado ficam guardados indefinidamente; registros de compra e eventos de webhook (com e-mail e nome) também | Princípio da necessidade (art. 6º, III) | Definir prazos (ex.: X meses após o fim do acesso) e, depois, rotina de exclusão ou anonimização |
| P4 | **Sem exportação self-service** (acesso/portabilidade) | Pedidos atendidos manualmente | Ação de exportação (CSV/JSON) no admin ou no Perfil |
| P5 | **Transferência internacional** (Vercel, Resend) | Ver J4 | Fixar a região da Vercel em São Paulo (`gru1`) e citar os fornecedores |
| P6 | **Incidentes** sem procedimento documentado | Art. 48 | Documento curto: quem avalia, prazos, como comunicar |

### Procedimento manual de exclusão (até existir o botão)
1. Supabase → **Authentication → Users** → localizar o e-mail → **Delete user**.
2. Isso apaga em cascata: profile, metas, histórico de metas, registros alimentares,
   favoritos, check-ins e eventos de uso.
3. Ficam: o registro de compra (`entitlements`, sem vínculo com a conta) e os eventos da
   Hotmart (`webhook_events`). Excluir ou anonimizar esses registros depende do prazo legal
   definido em P3.
4. Responder à titular confirmando a exclusão.
