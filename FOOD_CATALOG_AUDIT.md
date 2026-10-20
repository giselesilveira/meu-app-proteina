# FOOD_CATALOG_AUDIT — calculadora antiga × TACO oficial

**Fonte de comparação:** Tabela Brasileira de Composição de Alimentos — TACO, 4ª edição
revisada e ampliada (NEPA/UNICAMP, 2011), arquivo `data/taco/Taco_4a_edicao_2011.xls`
(sha256 `b7369a76…a15ace`, ver `TACO_SETUP.md`). Todos os valores TACO abaixo saem do
catálogo gerado (`data/taco/taco-foods.json`) e não foram digitados à mão.

**Valores antigos:** exportados de `app/page.tsx` (commit `be637ec`). A calculadora antiga
só tinha **proteína por 100 g**, sem preparação, sem calorias, sem gordura e sem fonte.

## Decisão geral

1. **Nenhum valor antigo foi copiado para o catálogo novo.** Todos os 590 alimentos ativos
   vêm da TACO, com a preparação exata do nome oficial.
2. Quando o nome antigo era ambíguo (ex.: "Peito de Frango", sem dizer se é cru ou
   grelhado), o app mostra **todas as preparações** da TACO e a aluna escolhe. Nunca há troca
   automática de uma preparação por outra.
3. Produtos de marca (whey, colágeno, beef protein, Iogurte do Tambo, iogurte grego) **não
   existem na TACO**. Eles ficam **fora do catálogo** até a equipe cadastrá-los com os dados do
   rótulo (Admin → Catálogo, ou CSV com `source_type=label`).
4. Alimentos antigos sem correspondência na TACO (tilápia) ficam **pendentes de cadastro
   manual validado** (`manual_authorized`), com fonte registrada.
5. A "unidade" antiga (ovo = 6 g, queijo = 7 g, scoop = 20 g…) **não foi migrada**: a TACO não
   traz peso de unidade e o valor antigo não tinha fonte. A equipe pode definir a porção padrão
   de cada alimento no Admin (campo "Porção padrão"), e ela aparece como atalho.

## Comparação item a item

Δ = proteína TACO − proteína antiga (g/100 g). Calorias em kcal/100 g, gordura em g/100 g.

| # | Alimento antigo | Proteína antiga | Código TACO | Nome oficial TACO | Preparação | Proteína TACO | Calorias | Gordura | Observação / divergência |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Atum Enlatado | 23 | 277 | Atum, conserva em óleo | conserva em óleo | 26,2 | 166 | 6 | Mais próximo: atum em conserva em óleo (TACO não tem atum em água). |
| 2 | Bife de Alcatra | 26 | 369 | Carne, bovina, miolo de alcatra, sem gordura, cru | cru | 21,6 | 163 | 7,8 | Valor antigo não bate com cru (21,6) nem grelhado (31,9). |
|  |  |  | 370 | Carne, bovina, miolo de alcatra, sem gordura, grelhado | grelhado | 31,9 | 241 | 11,6 | Δ proteína 5,9 |
| 3 | Camarão | 20 | 284 | Camarão, Rio Grande, grande, cozido | cozido | 19 | 90 | 1 | Antigo ≈ camarão cozido (19,0). Cru é bem diferente (10,0). |
|  |  |  | 285 | Camarão, Rio Grande, grande, cru | cru | 10 | 47 | 0,5 | Δ proteína -10,0 |
|  |  |  | 286 | Camarão, Sete Barbas, sem cabeça, com casca, frito | frito | 18,4 | 231 | 15,6 | Δ proteína -1,6 |
| 4 | Carne Moída (Patinho) | 24 | 376 | Carne, bovina, patinho, sem gordura, cru | cru | 21,7 | 133 | 4,5 | TACO não tem patinho MOÍDO; tem patinho em bife cru/grelhado. |
|  |  |  | 377 | Carne, bovina, patinho, sem gordura, grelhado | grelhado | 35,9 | 219 | 7,3 | Δ proteína 11,9 |
| 5 | Filé de Tilápia | 21 | — | — | — | — | — | — | TACO 4ª ed. NÃO tem tilápia. |
| 6 | Iogurte Grego | 10 | 448 | Iogurte, natural | — | 4,1 | 51 | 3 | TACO NÃO tem iogurte grego (produto de marca → rótulo). |
|  |  |  | 449 | Iogurte, natural, desnatado | — | 3,8 | 41 | 0,3 | Δ proteína -6,2 |
| 7 | Lombo de Porco | 27 | 432 | Porco, lombo, assado | assado | 35,7 | 210 | 6,4 | Antigo não bate com cru (22,6) nem assado (35,7). |
|  |  |  | 433 | Porco, lombo, cru | cru | 22,6 | 176 | 8,8 | Δ proteína -4,4 |
| 8 | Ovos Cozidos | 13 | 488 | Ovo, de galinha, inteiro, cozido/10minutos | cozido (10 minutos) | 13,3 | 146 | 9,5 | Bate com a TACO (13,3). Unidade antiga (6 g/ovo) não tem peso oficial. |
| 9 | Peito de Frango | 31 | 409 | Frango, peito, sem pele, cru | cru | 21,5 | 119 | 3 | Antigo ≈ grelhado (32,0)/cozido (31,5); cru = 21,5. |
|  |  |  | 410 | Frango, peito, sem pele, grelhado | grelhado | 32 | 159 | 2,5 | Δ proteína 1,0 |
|  |  |  | 408 | Frango, peito, sem pele, cozido | cozido | 31,5 | 163 | 3,2 | Δ proteína 0,5 |
| 10 | Queijo Minas | 18 | 461 | Queijo, minas, frescal | — | 17,4 | 264 | 20,2 | Antigo ≈ frescal (17,4). |
|  |  |  | 462 | Queijo, minas, meia cura | — | 21,2 | 321 | 24,6 | Δ proteína 3,2 |
| 11 | Salmão Assado | 22 | 315 | Salmão, filé, com pele, fresco, grelhado | grelhado | 23,9 | 229 | 14 | TACO não tem salmão ASSADO; tem cru e grelhado. |
|  |  |  | 316 | Salmão, sem pele, fresco, cru | cru | 19,3 | 170 | 9,7 | Δ proteína -2,7 |
|  |  |  | 317 | Salmão, sem pele, fresco, grelhado | grelhado | 26,1 | 243 | 14,5 | Δ proteína 4,1 |
| 12 | Sardinha Lata | 24 | 319 | Sardinha, conserva em óleo | conserva em óleo | 15,9 | 285 | 24 | Antigo (24) diverge da TACO em conserva (15,9). |
| 13 | Tofu | 8 | 584 | Soja, queijo (tofu) | — | 6,6 | 64 | 4 | TACO: 6,6 g. |
| 14 | Whey Protein | 80 | — | — | — | — | — | — | Suplemento de marca → rótulo. |
| 15 | Ovos de Codorna | 13 | 485 | Ovo, de codorna, inteiro, cru | cru | 13,7 | 177 | 12,7 | TACO só tem codorna CRU (13,7). |
| 16 | Iogurte do Tambo | 4,8 | — | — | — | — | — | — | Produto de marca → rótulo. |
| 17 | Proteína do Colágeno | 90 | — | — | — | — | — | — | Suplemento de marca → rótulo. |
| 18 | Beef Protein | 90 | — | — | — | — | — | — | Suplemento de marca → rótulo. |
| 19 | Clara de Ovo (de galinha) | 11 | 486 | Ovo, de galinha, clara, cozida/10minutos | cozida (10 minutos) | 13,4 | 59 | 0,1 | TACO só tem clara COZIDA (13,4); não há clara crua na TACO. |
| 20 | Sobrecoxa de Frango | 25 | 412 | Frango, sobrecoxa, com pele, crua | crua | 15,5 | 255 | 20,9 | Antigo não bate com cru (15,5/17,6) nem assado (28,7/29,2). |
|  |  |  | 414 | Frango, sobrecoxa, sem pele, crua | crua | 17,6 | 162 | 9,6 | Δ proteína -7,4 |
|  |  |  | 411 | Frango, sobrecoxa, com pele, assada | assada | 28,7 | 260 | 15,2 | Δ proteína 3,7 |
|  |  |  | 413 | Frango, sobrecoxa, sem pele, assada | assada | 29,2 | 233 | 12 | Δ proteína 4,2 |
| 21 | Coxa de Frango | 27 | 397 | Frango, coxa, com pele, crua | crua | 17,1 | 161 | 9,8 | Antigo ≈ coxa sem pele cozida (26,9) ou com pele assada (28,5). |
|  |  |  | 399 | Frango, coxa, sem pele, crua | crua | 17,8 | 120 | 4,9 | Δ proteína -9,2 |
|  |  |  | 396 | Frango, coxa, com pele, assada | assada | 28,5 | 215 | 10,4 | Δ proteína 1,5 |
|  |  |  | 398 | Frango, coxa, sem pele, cozida | cozida | 26,9 | 167 | 5,8 | Δ proteína -0,1 |
| 22 | Carne Moída | 26 | 326 | Carne, bovina, acém, moído, cozido | cozido | 26,7 | 212 | 10,9 | Antigo ≈ acém moído cozido (26,7). |
|  |  |  | 327 | Carne, bovina, acém, moído, cru | cru | 19,4 | 137 | 5,9 | Δ proteína -6,6 |
| 23 | Peixe Cru (Sushi) | 20 | 316 | Salmão, sem pele, fresco, cru | cru | 19,3 | 170 | 9,7 | Genérico; TACO tem salmão cru (19,3) e atum cru (25,7). Sushi tem arroz. |
|  |  |  | 278 | Atum, fresco, cru | cru | 25,7 | 118 | 0,9 | Δ proteína 5,7 |
| 24 | Carne de Porco | 27 | 433 | Porco, lombo, cru | cru | 22,6 | 176 | 8,8 | Genérico demais: depende do corte e preparo. |
|  |  |  | 432 | Porco, lombo, assado | assado | 35,7 | 210 | 6,4 | Δ proteína 8,7 |
|  |  |  | 427 | Porco, bisteca, crua | crua | 21,5 | 164 | 8 | Δ proteína -5,5 |
|  |  |  | 429 | Porco, bisteca, grelhada | grelhada | 28,9 | 280 | 17,4 | Δ proteína 1,9 |
|  |  |  | 436 | Porco, pernil, cru | cru | 20,1 | 186 | 11,1 | Δ proteína -6,9 |
|  |  |  | 435 | Porco, pernil, assado | assado | 32,1 | 262 | 13,9 | Δ proteína 5,1 |
| 25 | Coração de Frango | 28 | 394 | Frango, coração, cru | cru | 12,6 | 222 | 18,6 | Antigo (28) não bate com cru (12,6) nem grelhado (22,4). |
|  |  |  | 395 | Frango, coração, grelhado | grelhado | 22,4 | 207 | 12,1 | Δ proteína -5,6 |
| 26 | Fígado (Bovino) | 27 | 355 | Carne, bovina, fígado, cru | cru | 20,7 | 141 | 5,4 | Antigo (27) entre cru (20,7) e grelhado (29,9). |
|  |  |  | 356 | Carne, bovina, fígado, grelhado | grelhado | 29,9 | 225 | 9 | Δ proteína 2,9 |


## Itens que precisam de revisão manual da equipe

| Item antigo | O que falta | Ação sugerida |
|---|---|---|
| Whey Protein | Rótulo da marca usada pelas alunas | Cadastrar como `label` com marca, porção e valores do rótulo |
| Proteína do Colágeno | Rótulo | Idem |
| Beef Protein | Rótulo | Idem |
| Iogurte do Tambo | Rótulo (o antigo indicava pote de 200 g) | Idem, com porção padrão 200 g se o rótulo confirmar |
| Iogurte Grego | Rótulo da(s) marca(s) mais usadas | Idem (a TACO só tem iogurte natural) |
| Filé de Tilápia | Não existe na TACO 4ª ed. | Cadastrar como `manual_authorized` com a referência validada pela Nutri, ou orientar o uso de outro peixe da TACO |
| Peixe Cru (Sushi) | Genérico | A busca por "sashimi" já mostra salmão cru e atum cru da TACO. Sushi com arroz não tem item na TACO |
| Carne Moída (Patinho) | TACO não tem patinho moído | Usar "Carne moída (acém)" ou patinho em bife, conforme orientação. Ou cadastrar manualmente com fonte |
| Clara de ovo crua | TACO só tem clara cozida | Orientar o uso de "Clara de ovo, cozida" ou cadastrar com fonte validada |
| Salmão assado | TACO só tem cru e grelhado | Orientar o uso do grelhado ou cadastrar com fonte validada |

## Termos de busca (aliases) criados para os nomes antigos

Os nomes que as alunas já conheciam continuam funcionando na busca, **sempre mostrando as
opções oficiais**, sem escolher por elas. Exemplos: "atum lata", "bife de alcatra",
"bife de patinho", "carne moída", "carne de porco", "frango", "peito de frango", "filé de
frango", "sardinha lata", "ovos de codorna", "mussarela", "sashimi de salmão". A lista
completa está em `data/taco/curation.json`.
