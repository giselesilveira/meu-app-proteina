# TACO_VALIDATION — conferência dos dados importados

## Como a conferência foi feita

Os valores do catálogo saem da **planilha oficial** (`Taco_4a_edicao_2011.xls`). Para conferir,
comparamos com a **segunda publicação oficial independente**, o PDF
`taco_4_edicao_ampliada_e_revisada.pdf` (NEPA/UNICAMP, 2011), que também está em `data/taco/`.

1. **Conferência automática completa** (`npm run taco:validate`): lê o texto do PDF e compara
   energia, proteína, lipídeos, carboidrato, fibra e sódio dos **597 alimentos**.
2. **Conferência manual** de 15 alimentos (abaixo): a linha do PDF foi lida e comparada campo a
   campo com o catálogo.

## Resultado da conferência automática (20/10/2026)

| Item | Resultado |
|---|---|
| Alimentos na planilha oficial | 597 (o esperado para a TACO 4ª ed.) |
| Valores comparados com o PDF | **3.415** |
| Divergências | **0** |
| Alimentos conferidos em todos os campos | 578 |
| Alimentos conferidos parcialmente | 19 (células em branco no PDF; ver abaixo) |
| Alimentos ativos no app | 590 |
| Alimentos inativos (pendentes) | 7 |

Relatório completo, alimento por alimento: `data/taco/validation-report.json`.

### Conferidos parcialmente (19)

Nesses alimentos o PDF tem colunas em branco ("análise não solicitada"), o que impede o
alinhamento automático de algumas colunas. Os campos principais foram conferidos manualmente:

- **259, 260, 267–272 (azeites e óleos):** PDF = 884 kcal, proteína NA, lipídeos 100,0. Catálogo
  = 884 kcal, proteína 0 (NA = não aplicável), lipídeos 100. Sódio em branco no PDF, nulo no
  catálogo. ✔
- **387, 388 (croquete de carne), 442 (quibe frito), 537, 538 (estrogonofe), 548 (sarapatel):**
  fibra em branco no PDF, nula no catálogo. Energia, proteína, lipídeos e carboidrato conferem. ✔
- **513 (fermento químico), 519 (tempero a base de sal):** conferem nos campos disponíveis. ✔
- **472 (cana, aguardente), 516 (sal dietético), 517 (sal grosso):** sem proteína/lipídeos/
  energia aplicáveis na TACO, por isso **inativos** no app. ✔

### Inativos / pendentes (7), que não aparecem para as alunas

| Código | Alimento | Motivo |
|---|---|---|
| 450 | Iogurte, sabor abacaxi | TACO marca "*" (análise em reavaliação) |
| 457 | Leite, de vaca, desnatado, UHT | "*" em energia/proteína/lipídeos |
| 458 | Leite, de vaca, integral | "*" em energia/proteína/lipídeos |
| 591 | Coco, verde, cru | "*" |
| 472 | Cana, aguardente | proteína e lipídeos em branco |
| 516 | Sal, dietético | energia "NA" |
| 517 | Sal, grosso | energia "NA" |

> **Atenção, equipe:** leite de vaca integral e desnatado **não têm valores válidos na TACO 4ª
> edição** (estão em reavaliação). Se as alunas precisarem registrar leite, cadastrem a marca
> pelo rótulo (`label`). Não usem valores de outras fontes sem validação.

## Conferência manual: 15 alimentos

Formato: proteína / calorias / lipídeos / carboidrato / sódio (por 100 g).
"Linha do PDF" mostra o texto oficial: umidade, kcal, kJ, **proteína**, **lipídeos**, colesterol,
**carboidrato**, fibra, cinzas, cálcio, magnésio.

| Código | Alimento (nome oficial) | Preparação | Catálogo (P / kcal / L / CHO / Na) | PDF (P / kcal / L / CHO / Na) | Resultado |
|---|---|---|---|---|---|
| 410 | Frango, peito, sem pele, grelhado | grelhado | 32 / 159 / 2,5 / 0 / 50 | 32 / 159 / 2,5 / 0 / 50 | ✔ confere |
| 488 | Ovo, de galinha, inteiro, cozido/10minutos | cozido (10 minutos) | 13,3 / 146 / 9,5 / 0,6 / 146 | 13,3 / 146 / 9,5 / 0,6 / 146 | ✔ confere |
| 486 | Ovo, de galinha, clara, cozida/10minutos | cozida (10 minutos) | 13,4 / 59 / 0,1 / 0 / 181 | 13,4 / 59 / 0,1 / 0 / 181 | ✔ confere |
| 377 | Carne, bovina, patinho, sem gordura, grelhado | grelhado | 35,9 / 219 / 7,3 / 0 / 60 | 35,9 / 219 / 7,3 / 0 / 60 | ✔ confere |
| 370 | Carne, bovina, miolo de alcatra, sem gordura, grelhado | grelhado | 31,9 / 241 / 11,6 / 0 / 52 | 31,9 / 241 / 11,6 / 0 / 52 | ✔ confere |
| 326 | Carne, bovina, acém, moído, cozido | cozido | 26,7 / 212 / 10,9 / 0 / 52 | 26,7 / 212 / 10,9 / 0 / 52 | ✔ confere |
| 432 | Porco, lombo, assado | assado | 35,7 / 210 / 6,4 / 0 / 39 | 35,7 / 210 / 6,4 / 0 / 39 | ✔ confere |
| 317 | Salmão, sem pele, fresco, grelhado | grelhado | 26,1 / 243 / 14,5 / 0 / 96 | 26,1 / 243 / 14,5 / 0 / 96 | ✔ confere |
| 319 | Sardinha, conserva em óleo | conserva em óleo | 15,9 / 285 / 24 / 0 / 666 | 15,9 / 285 / 24 / 0 / 666 | ✔ confere |
| 277 | Atum, conserva em óleo | conserva em óleo | 26,2 / 166 / 6 / 0 / 362 | 26,2 / 166 / 6 / 0 / 362 | ✔ confere |
| 584 | Soja, queijo (tofu) | — | 6,6 / 64 / 4 / 2,1 / 1 | 6,6 / 64 / 4 / 2,1 / 1 | ✔ confere |
| 461 | Queijo, minas, frescal | — | 17,4 / 264 / 20,2 / 3,2 / 31 | 17,4 / 264 / 20,2 / 3,2 / 31 | ✔ confere |
| 1 | Arroz, integral, cozido | cozido | 2,6 / 124 / 1 / 25,8 / 1 | 2,6 / 124 / 1 / 25,8 / 1 | ✔ confere |
| 561 | Feijão, carioca, cozido | cozido | 4,8 / 76 / 0,5 / 13,6 / 2 | 4,8 / 76 / 0,5 / 13,6 / 2 | ✔ confere |
| 385 | Carne, bovina, seca, crua | crua | 19,7 / 313 / 25,4 / 0 / 4440 | 19,7 / 313 / 25,4 / 0 / 4440 | ✔ confere |

Linhas do PDF usadas na conferência manual (tabela de composição centesimal):

```
410 Frango, peito, sem pele, grelhado 63,8 159 666 32,0 2,5 89 0,0 NA 1,4 5 18
488 Ovo, de galinha, inteiro, cozido/10minutos 75,8 146 610 13,3 9,5 397 0,6 NA 0,8 49 11
486 Ovo, de galinha, clara, cozida/10minutos 85,2 59 249 13,4 0,1 NA 0,0 NA 0,7 6 11
377 Carne, bovina, patinho, sem gordura, grelhado 55,2 219 917 35,9 7,3 126 0,0 NA 1,3 5 27
370 Carne, bovina, miolo de alcatra, sem gordura, grelhado 52,4 241 1010 31,9 11,6 92 0,0 NA 1,2 5 26
326 Carne, bovina, acém, moído, cozido 61,6 212 889 26,7 10,9 103 0,0 NA 0,8 4 17
432 Porco, lombo, assado 56,6 210 880 35,7 6,4 103 0,0 NA 1,4 20 18
317 Salmão, sem pele, fresco, grelhado 58,1 243 1015 26,1 14,5 73 0,0 NA 1,6 15 38
319 Sardinha, conserva em óleo 55,1 285 1192 15,9 24,0 73 0,0 NA 2,9 550 35
277 Atum, conserva em óleo 64,5 166 694 26,2 6,0 53 0,0 NA 1,5 7 29
584 Soja, queijo (tofu) 86,6 64 270 6,6 4,0 NA 2,1 0,8 0,7 81 38
461 Queijo, minas, frescal 56,1 264 1106 17,4 20,2 62 3,2 NA 3,0 579 7
1   Arroz, integral, cozido 70,1 124 517 2,6 1,0 NA 25,8 2,7 0,5 5 59
561 Feijão, carioca, cozido 80,4 76 320 4,8 0,5 NA 13,6 8,5 0,7 27 42
385 Carne, bovina, seca, crua 39,2 313 1309 19,7 25,4 92 0,0 NA 15,3 14 12
```

Exemplo de sódio (tabela de minerais, coluna "Sódio"): `410 Tr 295 0,3 50 …` → 50 mg ✔;
`488 0,02 184 1,5 146 …` → 146 mg ✔.

## Conclusão

Nenhum valor importado diverge da publicação oficial. Nenhum valor foi estimado: nutrientes
sem análise na TACO ficam **nulos** e aparecem como "—" no app. Alimentos sem energia ou
proteína válidas ficam **inativos**.
