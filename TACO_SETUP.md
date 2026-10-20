# TACO_SETUP — fonte nutricional oficial

## Qual fonte é usada

**Tabela Brasileira de Composição de Alimentos — TACO, 4ª edição revisada e ampliada**
(NEPA/UNICAMP, Campinas, 2011). Os termos da publicação permitem a reprodução, total ou
parcial, desde que a fonte seja citada. O app mostra "Fonte: TACO nº …" em cada alimento.

Arquivos em `data/taco/`:

| Arquivo | O que é | SHA-256 |
|---|---|---|
| `Taco_4a_edicao_2011.xls` | Planilha oficial distribuída pelo NEPA (aba "CMVCol taco3") | `b7369a767b14bfe06ff9973957c140b266f9bb7932f870481ef2d99ba0a15ace` |
| `taco_4_edicao_ampliada_e_revisada.pdf` | Publicação oficial em PDF (usada para conferência) | `2002aec5615b5b1395aaa8fa675635bbb7f712c33f278af5e332f1cac8f108c8` |
| `curation.json` | Nomes amigáveis e termos de busca. **Sem nenhum valor nutricional** | — |
| `taco-foods.json` | Catálogo normalizado gerado pelo script (revisável) | — |
| `validation-report.json` | Relatório da conferência com o PDF | — |

**Procedência:** a rede do ambiente de desenvolvimento não alcançava o site do NEPA. Os dois
arquivos foram obtidos de uma cópia pública do material oficial no repositório
`github.com/raulfdm/taco-api` (pasta `references/`, commit `06e466a`, fev/2025). Como os dois
arquivos são independentes (planilha × PDF) e os 3.415 valores conferidos batem entre si, a
cópia é fiel. **Recomendação:** baixe a planilha diretamente em
a página oficial da TACO no site do NEPA (https://www.nepa.unicamp.br/ , seção "Tabela Brasileira de Composição de Alimentos — 4ª edição"),
confira o SHA-256 acima (`sha256sum Taco_4a_edicao_2011.xls`) e, se for diferente, substitua o
arquivo e rode os passos abaixo.

## Regras de normalização (scripts/lib/taco-parse.ts)

| Na TACO | No app |
|---|---|
| Valor numérico | Arredondado na precisão publicada: kcal e sódio inteiros; proteína, lipídeos, carboidrato e fibra com 1 casa |
| `Tr` (traço: abaixo do limite de quantificação) | 0 |
| `NA` (não aplicável: o nutriente não existe no alimento) | 0 |
| `*` (análise em reavaliação) | nulo, e o alimento fica **inativo** se faltar energia, proteína ou lipídeos |
| em branco (análise não solicitada) | nulo |

Nenhum valor é estimado. A preparação (cru, cozido, grelhado, assado, frito…) vem do nome
oficial e é obrigatória no nome exibido: o script **recusa** um nome amigável que omita a
preparação.

## Como (re)importar

```bash
npm install
npm run taco:build      # lê o .xls oficial -> data/taco/taco-foods.json + supabase/seed/taco_food_catalog.sql
npm run taco:validate   # confere com o PDF oficial (precisa do pdftotext / poppler-utils)
```

Depois, **uma** das opções:

- **Pelo painel do Supabase (mais simples):** SQL Editor → New query → cole o conteúdo de
  `supabase/seed/taco_food_catalog.sql` → Run.
- **Pelo terminal:** com `.env.local` preenchido, rode `npm run taco:import`.

As duas são **idempotentes**: rodar de novo atualiza os mesmos registros (chave = código TACO),
sem duplicar. Registros antigos das alunas não mudam, porque cada registro guarda o seu
snapshot nutricional.

## Alimentos que não estão na TACO

Produtos de marca (whey, colágeno, iogurte grego, barras, bebidas) e alimentos sem
correspondência (ex.: tilápia) **não** devem ser aproximados por outro alimento da TACO.
Cadastre-os pelo Admin → Catálogo (ou CSV em `data/templates/alimentos-modelo.csv`) com:

- `source_type = label`: dados copiados do **rótulo** (marca obrigatória);
- `source_type = manual_authorized`: dados **validados pela equipe da Nutri Gisele**.

Os dois exigem fonte/referência. O app registra quem cadastrou e quando.
