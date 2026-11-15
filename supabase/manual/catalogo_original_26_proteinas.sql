-- ATENCAO: executar apenas no banco de TESTES, nunca no banco de producao.
-- Antes de executar, confirmar que o Preview Vercel usa um projeto Supabase separado.
-- Catalogo idempotente: preserva IDs de alimentos ja criados e todos os registros historicos.
-- Coluna calorias=0 apenas por exigencia do esquema legado; nao representa valor nutricional.
BEGIN;
WITH original (name, display_name, category, preparation, protein_per_100g, calories_per_100g, fat_per_100g, carbohydrate_per_100g, source_type, source_reference, is_active) AS (
 VALUES
  ('Atum Enlatado','Atum Enlatado','Proteínas',NULL,23,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Bife de Alcatra','Bife de Alcatra','Proteínas',NULL,26,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Camarão','Camarão','Proteínas',NULL,20,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Carne Moída (Patinho)','Carne Moída (Patinho)','Proteínas',NULL,24,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Filé de Tilápia','Filé de Tilápia','Proteínas',NULL,21,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Iogurte Grego','Iogurte Grego','Proteínas',NULL,10,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Lombo de Porco','Lombo de Porco','Proteínas',NULL,27,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Ovos Cozidos','Ovos Cozidos','Proteínas',NULL,13,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Peito de Frango','Peito de Frango','Proteínas',NULL,31,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Queijo Minas','Queijo Minas','Proteínas',NULL,18,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Salmão Assado','Salmão Assado','Proteínas',NULL,22,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Sardinha Lata','Sardinha Lata','Proteínas',NULL,24,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Tofu','Tofu','Proteínas',NULL,8,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Whey Protein','Whey Protein','Proteínas',NULL,80,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Ovos de Codorna','Ovos de Codorna','Proteínas',NULL,13,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Iogurte do Tambo','Iogurte do Tambo','Proteínas',NULL,4.8,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Proteína do Colágeno','Proteína do Colágeno','Proteínas',NULL,90,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Beef Protein','Beef Protein','Proteínas',NULL,90,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Clara de Ovo (de galinha)','Clara de Ovo (de galinha)','Proteínas',NULL,11,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Sobrecoxa de Frango','Sobrecoxa de Frango','Proteínas',NULL,25,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Coxa de Frango','Coxa de Frango','Proteínas',NULL,27,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Carne Moída','Carne Moída','Proteínas',NULL,26,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Peixe Cru (Sushi)','Peixe Cru (Sushi)','Proteínas',NULL,20,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Carne de Porco','Carne de Porco','Proteínas',NULL,27,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Coração de Frango','Coração de Frango','Proteínas',NULL,28,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true),
  ('Fígado (Bovino)','Fígado (Bovino)','Proteínas',NULL,27,0,NULL,NULL,'manual_authorized','Calculadora original da Nutri Gisele',true)
)
INSERT INTO public.food_catalog (name,display_name,category,preparation,protein_per_100g,calories_per_100g,fat_per_100g,carbohydrate_per_100g,source_type,source_reference,is_active)
SELECT
  o.name::text, o.display_name::text, o.category::text, o.preparation::text,
  o.protein_per_100g::numeric, o.calories_per_100g::numeric,
  o.fat_per_100g::numeric, o.carbohydrate_per_100g::numeric,
  o.source_type::text, o.source_reference::text, o.is_active::boolean
FROM original o
WHERE NOT EXISTS (
 SELECT 1 FROM public.food_catalog f WHERE f.display_name=o.display_name AND f.source_reference='Calculadora original da Nutri Gisele'
);
-- Reativa o conjunto original e desativa somente os demais itens apos conferir a insercao.
DO $$
BEGIN
 IF (SELECT count(*) FROM public.food_catalog WHERE source_reference='Calculadora original da Nutri Gisele') <> 26 THEN
  RAISE EXCEPTION 'Esperados exatamente 26 alimentos originais. Transacao cancelada.';
 END IF;
 UPDATE public.food_catalog
 SET is_active = (source_reference='Calculadora original da Nutri Gisele');
END $$;
COMMIT;
