-- 003_add_hunting_guide.sql
-- Lägger till "Hunting guide" som ett eget tillval (samma pris som fiskeguiden, 8000 kr/dag).
-- Guide-kortet i det publika flödet grupperar 'guide' (fiske) och 'guide_hunting' (jakt)
-- så att gästen kan välja endera eller båda, med dagväljare per typ.
--
-- Kör i Supabase SQL Editor. Idempotent: on conflict (slug) uppdaterar den befintlig rad.

insert into addons (slug, price, price_type, sort_order, is_active, translations) values
  ('guide_hunting', 8000, 'per_day', 3, true, '{
    "en": { "name": "Hunting guide", "description": "Full day with a private hunting guide. Lunch included." },
    "sv": { "name": "Jaktguide", "description": "Heldag med privat jaktguide. Lunch ingår." },
    "de": { "name": "Jagdguide", "description": "Ganzer Tag mit privatem Jagdguide. Mittagessen inklusive." },
    "fr": { "name": "Guide de chasse", "description": "Journée complète avec guide de chasse privé. Déjeuner inclus." }
  }')
on conflict (slug) do update
  set price = excluded.price,
      price_type = excluded.price_type,
      is_active = excluded.is_active,
      translations = excluded.translations;

-- Justera sort_order så guiderna hamnar bredvid varandra och övriga tillval efter.
update addons set sort_order = 1 where slug = 'boat';
update addons set sort_order = 2 where slug = 'guide';
update addons set sort_order = 3 where slug = 'guide_hunting';
update addons set sort_order = 4 where slug = 'linens';
update addons set sort_order = 5 where slug = 'cleaning';
