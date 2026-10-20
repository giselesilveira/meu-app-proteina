# HOTMART_PURCHASE_TEST: checklist da compra de teste

Use um e-mail que **nunca** entrou no app (ex.: um Gmail pessoal). Marque cada item.

| # | Passo | Como conferir | ✔ |
|---|---|---|---|
| 1 | **Realizar compra teste** do produto da Maratona (cupom 100% ou compra real de valor baixo, depois reembolsada) | Hotmart → Vendas mostra a transação `HP…` | ☐ |
| 2 | **Webhook recebido** | Hotmart → Webhook → Histórico: status **200** | ☐ |
| 3 | **Evento aparece no banco** | App → Admin → **Eventos Hotmart**: `PURCHASE_APPROVED` com status `processed` | ☐ |
| 4 | **Entitlement criado** | Admin → **Alunas e acessos**: e-mail com status `active`, origem `hotmart`, transação, produto e oferta preenchidos, "Ainda não entrou" | ☐ |
| 5 | **E-mail normalizado** | Na lista, o e-mail aparece todo em minúsculas, sem espaços | ☐ |
| 6 | (Se o Resend estiver configurado) **E-mail de boas-vindas** | Caixa de entrada: "Seu acesso ao App Maratona 21 está liberado" com o botão **ACESSAR O APP** | ☐ |
| 7 | **Aluna acessa o app** | Abrir `https://nutrigiselesilveira.com.br/app` no celular | ☐ |
| 8 | **Usa o mesmo e-mail** (teste também com uma letra maiúscula) | Tela Entrar → e-mail → **Receber código** | ☐ |
| 9 | **Recebe o código / link** | E-mail "Seu código de acesso" chega em menos de 1 minuto (confira o spam) | ☐ |
| 10 | **Entitlement é associado** | Admin → a linha passa a mostrar "Já entrou no app" | ☐ |
| 11 | **Onboarding abre** | Boas-vindas → nome → peso → meta (1,5 / 1,8 / 2,0) → "sua meta diária de proteína será de XX g" | ☐ |
| 12 | **App funciona** | Registrar um alimento (ex.: "frango grelhado", 120 g = 38,4 g de proteína), favoritar, ver em Hoje e no Histórico, fazer um check-in, sair e entrar de novo: tudo continua salvo | ☐ |
| 13 | **Instalar na tela inicial** | iPhone: Safari → Compartilhar → Adicionar à Tela de Início. Android: menu → Instalar app | ☐ |

Se o passo 3 mostrar `ignored`, abra o evento e leia o motivo:
- "HOTMART_ALLOWED_PRODUCT_UCODES não configurado" ou "produto não liberado": copie
  `data.product.ucode` do payload para a variável na Vercel, faça o redeploy e **reenvie** o
  evento pela Hotmart.
- "oferta não liberada": ajuste `HOTMART_ALLOWED_OFFER_CODES` (ou deixe vazio).

Se o passo 2 mostrar **401**, o hottok da Vercel está diferente do da Hotmart.
