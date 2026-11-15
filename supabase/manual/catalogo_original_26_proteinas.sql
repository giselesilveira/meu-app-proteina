-- Catalogo original de 26 alimentos (calculadora da Nutri Gisele).
-- ATENCAO: o projeto Supabase e COMPARTILHADO entre Production e Preview.
-- Executar somente com autorizacao e com o backup CSV de food_catalog em maos.
--
-- O que este script faz (tudo em UMA transacao; qualquer erro desfaz tudo):
--   1. Guarda o estado atual de is_active de todos os alimentos em
--      public.food_catalog_backup_20261115 (apenas na primeira execucao).
--   2. Insere os 26 alimentos que ainda nao existem (preserva IDs ja criados).
--   3. Garante os valores de proteina corretos nos 26 originais.
--   4. Ativa os 26 originais e DESATIVA (sem excluir) os demais.
--   5. Confere que ha exatamente 26 alimentos ativos antes do COMMIT.
-- Nao exclui alimentos, consumos (food_entries), favoritos nem usuarios.
-- food_entries guarda um snapshot nutricional proprio; o historico nao muda.
-- Idempotente: pode ser executado de novo sem efeitos adicionais.
-- Coluna calorias=0 apenas por exigencia do esquema legado; nao e exibida.
--
-- Reverter (se necessario):
--   UPDATE public.food_catalog f SET is_active = b.is_active
--     FROM public.food_catalog_backup_20261115 b
--    WHERE b.id = f.id AND f.is_active IS DISTINCT FROM b.is_active;
--   UPDATE public.food_catalog SET is_active = false
--    WHERE source_reference = 'Calculadora original da Nutri Gisele'
--      AND id NOT IN (SELECT id FROM public.food_catalog_backup_20261115);

BEGIN;

-- 1. Backup do estado atual (nao sobrescreve um backup ja existente).
CREATE TABLE IF NOT EXISTS public.food_catalog_backup_20261115 AS
  SELECT id, display_name, source_type, source_reference, protein_per_100g, is_active, now() AS backed_up_at
  FROM public.food_catalog;
ALTER TABLE public.food_catalog_backup_20261115 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.food_catalog_backup_20261115 FROM anon, authenticated;

-- 2 e 3. Lista oficial.
CREATE TEMP TABLE original_26 (
  display_name text PRIMARY KEY,
  protein_per_100g numeric(7, 2) NOT NULL
) ON COMMIT DROP;

INSERT INTO original_26 (display_name, protein_per_100g) VALUES
  ('Atum Enlatado', 23),
  ('Bife de Alcatra', 26),
  ('Camarão', 20),
  ('Carne Moída (Patinho)', 24),
  ('Filé de Tilápia', 21),
  ('Iogurte Grego', 10),
  ('Lombo de Porco', 27),
  ('Ovos Cozidos', 13),
  ('Peito de Frango', 31),
  ('Queijo Minas', 18),
  ('Salmão Assado', 22),
  ('Sardinha Lata', 24),
  ('Tofu', 8),
  ('Whey Protein', 80),
  ('Ovos de Codorna', 13),
  ('Iogurte do Tambo', 4.8),
  ('Proteína do Colágeno', 90),
  ('Beef Protein', 90),
  ('Clara de Ovo (de galinha)', 11),
  ('Sobrecoxa de Frango', 25),
  ('Coxa de Frango', 27),
  ('Carne Moída', 26),
  ('Peixe Cru (Sushi)', 20),
  ('Carne de Porco', 27),
  ('Coração de Frango', 28),
  ('Fígado (Bovino)', 27);

INSERT INTO public.food_catalog
  (name, display_name, category, preparation, protein_per_100g, calories_per_100g,
   fat_per_100g, carbohydrate_per_100g, source_type, source_reference, is_active)
SELECT o.display_name, o.display_name, 'Proteínas', NULL, o.protein_per_100g, 0::numeric,
       NULL::numeric, NULL::numeric, 'manual_authorized', 'Calculadora original da Nutri Gisele', true
FROM original_26 o
WHERE NOT EXISTS (
  SELECT 1 FROM public.food_catalog f
  WHERE f.display_name = o.display_name
    AND f.source_reference = 'Calculadora original da Nutri Gisele'
);

UPDATE public.food_catalog f
   SET protein_per_100g = o.protein_per_100g
  FROM original_26 o
 WHERE f.display_name = o.display_name
   AND f.source_reference = 'Calculadora original da Nutri Gisele'
   AND f.protein_per_100g IS DISTINCT FROM o.protein_per_100g;

-- 4. Ativa os originais e desativa os demais (somente linhas que mudam).
DO $$
BEGIN
  IF (SELECT count(*) FROM public.food_catalog WHERE source_reference = 'Calculadora original da Nutri Gisele') <> 26 THEN
    RAISE EXCEPTION 'Esperados exatamente 26 alimentos originais. Transacao cancelada.';
  END IF;
END $$;

UPDATE public.food_catalog
   SET is_active = (source_reference = 'Calculadora original da Nutri Gisele')
 WHERE is_active IS DISTINCT FROM (source_reference = 'Calculadora original da Nutri Gisele');

-- 5. Conferencia final.
DO $$
DECLARE
  n_active integer;
  n_wrong integer;
BEGIN
  SELECT count(*) INTO n_active FROM public.food_catalog WHERE is_active;
  SELECT count(*) INTO n_wrong
    FROM original_26 o
    LEFT JOIN public.food_catalog f
      ON f.display_name = o.display_name
     AND f.source_reference = 'Calculadora original da Nutri Gisele'
     AND f.is_active
   WHERE f.id IS NULL OR f.protein_per_100g <> o.protein_per_100g;
  IF n_active <> 26 OR n_wrong <> 0 THEN
    RAISE EXCEPTION 'Conferencia falhou: % ativos, % divergentes. Transacao cancelada.', n_active, n_wrong;
  END IF;
END $$;

COMMIT;

-- Resultado esperado: 26 linhas, todas ativas.
SELECT display_name, protein_per_100g, is_active
  FROM public.food_catalog
 WHERE is_active
 ORDER BY display_name;
